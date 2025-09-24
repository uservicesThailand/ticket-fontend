// server.js
import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import cors from "cors";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import * as line from "@line/bot-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
console.log("LINE_ENABLED =", !!(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET));

// ===== LINE Messaging API (Optional) =====
const LINE_ENABLED =
    !!process.env.LINE_CHANNEL_ACCESS_TOKEN && !!process.env.LINE_CHANNEL_SECRET;

const lineClient = LINE_ENABLED
    ? new line.Client({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.LINE_CHANNEL_SECRET,
    })
    : null;

/**
 * หมวดหมู่ → LINE userId (แก้เป็นของจริง)
 * - ใช้ userId (ขึ้นต้นด้วย "U") สำหรับ push แบบ 1:1
 * - ถ้าจะยิงเข้ากลุ่ม ใช้ groupId ("C...") / roomId ("R...")
 */
const LINE_CATEGORY_MAP = {
    PC: process.env.LINE_TOKEN_CHAOWALIT,//พี่ริท
    PRN: process.env.LINE_TOKEN_CHAOWALIT,
    NET: process.env.LINE_TOKEN_PICHEAD,
    FORM: process.env.LINE_TOKEN_CHAOWALIT,
    SYS: process.env.LINE_TOKEN_PIMLAPAS, //พิมพ์
    ERP: process.env.LINE_TOKEN_CHAOWALIT,
    ACC: process.env.LINE_TOKEN_CHAOWALIT,
    OTH: process.env.LINE_TOKEN_CHAOWALIT,
};
// ============== THEME FLEX ==============
// ถ้ามีรูป hero ของ ticket ให้ส่งมาใน extra.heroUrl (ต้องเป็น https และสาธารณะ)
function buildLineFlexBubble(ticket, extra = {}) {
    const {
        code,
        title,
        category,
        detail,
        department,
        requester,
        branch,
        symptom,      // ถ้ามี field อาการใน ticket (ไม่มีไม่เป็นไร)
        status = "NEW",
        createdAt,    // Date | string
    } = ticket;

    const created =
        createdAt instanceof Date
            ? createdAt.toLocaleString("th-TH")
            : (createdAt || "");

    // ใช้รูปจาก LINE docs เป็นค่าเริ่มต้น ถ้าไม่มี heroUrl ของเราเอง
    const heroUrl = extra.heroUrl || "https://developers-resource.landpress.line.me/fx/img/01_1_cafe.png";

    return {
        type: "bubble",
        /*  hero: {
             type: "image",
             url: "https://img.freepik.com/free-vector/flat-illustration-customer-support_23-2148897753.jpg",
             size: "full",
             aspectRatio: "1:1",
             aspectMode: "fit",
             action: {
                 type: "uri",
                 uri: extra.publicUrl || "https://line.me/"
             }
         }, */
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: "แจ้งเตือนคำขอใหม่",
                    weight: "bold",
                    size: "xl"
                },
                {
                    type: "box",
                    layout: "vertical",
                    contents: [],
                    height: "2px",        // ความหนาเส้น
                    margin: "md",
                    backgroundColor: "#FF6600"  // สีส้ม
                },
                {
                    type: "box",
                    layout: "vertical",
                    margin: "lg",
                    spacing: "sm",
                    contents: [
                        {
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                { type: "text", text: "Ticket ID:", color: "#aaaaaa", size: "sm", flex: 2 },
                                { type: "text", text: code || "-", wrap: true, color: "#666666", size: "sm", flex: 5 }
                            ]
                        },
                        {
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                { type: "text", text: "แผนก:", color: "#aaaaaa", size: "sm", flex: 2 },
                                { type: "text", text: branch + " - " + department || "-", wrap: true, color: "#666666", size: "sm", flex: 5 }
                            ]
                        },
                        {
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                { type: "text", text: "ผู้แจ้ง:", color: "#aaaaaa", size: "sm", flex: 2 },
                                { type: "text", text: requester || "-", wrap: true, color: "#666666", size: "sm", flex: 5 }
                            ]
                        },
                        {
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                { type: "text", text: "อาการ:", color: "#aaaaaa", size: "sm", flex: 2 },
                                {
                                    type: "text",
                                    text: (symptom || detail || "-").toString().substring(0, 500), // กันยาวเกิน
                                    wrap: true, color: "#666666", size: "sm", flex: 5
                                }
                            ]
                        },
                        /*  {
                             type: "box",
                             layout: "baseline",
                             spacing: "sm",
                             contents: [
                                 { type: "text", text: "สถานะ:", color: "#aaaaaa", size: "sm", flex: 2 },
                                 { type: "text", text: status, wrap: true, color: "#666666", size: "sm", flex: 5 }
                             ]
                         }, */
                        created
                            ? {
                                type: "box",
                                layout: "baseline",
                                spacing: "sm",
                                contents: [
                                    { type: "text", text: "เวลา:", color: "#aaaaaa", size: "sm", flex: 2 },
                                    { type: "text", text: created, wrap: true, color: "#666666", size: "sm", flex: 5 }
                                ]
                            }
                            : null
                    ].filter(Boolean)
                }
            ]
        },
        footer: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
                {
                    type: "button",
                    style: "primary",
                    height: "sm",
                    action: {
                        type: "uri",
                        label: "อัพเดทสถานะ",
                        uri: extra.updateUrl || extra.publicUrl || "https://line.me/"
                    }
                },
                {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    action: {
                        type: "uri",
                        label: "ข้อมูลในระบบ",
                        uri: extra.publicUrl || "https://line.me/"
                    }
                },
                { type: "box", layout: "vertical", contents: [], margin: "sm" }
            ],
            flex: 0
        }
    };
}

// แทนที่ buildLineMessage เดิมด้วยเวอร์ชัน Flex
function buildLineMessage(ticket, extra = {}) {
    const bubble = buildLineFlexBubble(ticket, extra);
    return {
        type: "flex",
        altText: `[${ticket?.code || "Ticket"}] แจ้งเตือนคำขอใหม่`,
        contents: bubble,
    };
}

// ใช้เหมือนเดิม แค่ได้ Flex กลับแทนข้อความธรรมดา
function notifyLineByCategory(ticket, extra = {}) {
    if (!LINE_ENABLED || !lineClient) return;
    const userId = LINE_CATEGORY_MAP[ticket.category];
    if (!userId) {
        console.warn("No LINE mapping for category:", ticket.category);
        return;
    }

    const message = buildLineMessage(ticket, extra);

    // fire-and-forget
    lineClient.pushMessage(userId, message).catch((err) => {
        const resp = err?.originalError?.response?.data;
        console.error("LINE push error:", resp || err.message || err);
    });
}

/** ------------------ CORS ------------------ */
const allowedOrigins = [
    "http://localhost:5173",
    "http://192.168.102.106:5173",
    "http://192.168.112.49:5173",
    "http://192.168.102.106:5173",
    "http://192.168.102.103:5173"
    // ใส่ origin โปรดักชันจริงด้วย เช่น "https://jobsheet.u-services.co.th"
];

app.use(
    cors({
        origin(origin, cb) {
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            return cb(new Error("Not allowed by CORS"));
        },
        credentials: false, //  ไม่ใช้คุกกี้แล้ว
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(express.json());

/** ---------------- MySQL Pool ---------------- */
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
    },
});

/** ---------------- JWT ---------------- */
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_EXPIRES = "8h";

function signToken(user, branch) {
    return jwt.sign(
        {
            sub: user.user_key,
            username: user.username,
            role: user.u_role || "member",
            branch_log: user.branch_log || null,
            branch_current: branch || null,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
}

function requireAuthJWT(req, res, next) {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Unauthorized" });
    }
}

function requireAdminJWT(req, res, next) {
    if (!req.user || req.user.role !== "admin")
        return res.status(403).json({ error: "Forbidden" });
    next();
}

/** ---------------- Upload config ---------------- */
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "ticket");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"), {
        maxAge: "7d",
        etag: true,
    })
);

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
        filename: (_req, file, cb) => {
            const ts = Date.now();
            const rnd = Math.random().toString(36).slice(2, 8);
            const ext = path.extname(file.originalname || "").toLowerCase() || ".bin";
            cb(null, `${ts}-${rnd}${ext}`);
        },
    }),
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith("image/")) {
            return cb(new Error("อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น"));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});

/** ---------------- Debug logger (JWT) ---------------- */
app.use((req, _res, next) => {
    const auth = req.headers.authorization || "";
    const hasBearer = auth.startsWith("Bearer ");
    let jwtUser = null;
    if (hasBearer) {
        try {
            const p = jwt.verify(auth.slice(7), JWT_SECRET);
            jwtUser = p?.sub || null;
        } catch {
            jwtUser = null;
        }
    }
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
        origin: req.headers.origin,
        hasAuth: hasBearer,
        jwtUser,
    });
    next();
});
/* ----------------- */
// ---------- generateUsername: ใช้ pool + ใส่ backtick ชื่อตาราง ----------
async function generateUsername(branch, department) {
    const b = String(branch || '').toUpperCase().trim();
    const d = String(department || '').toUpperCase().trim();
    const prefix = `TK${b}${d}`;

    const [rows] = await pool.query(
        `SELECT user_username
       FROM ticket_user
      WHERE user_username LIKE ?
      ORDER BY user_username DESC
      LIMIT 1`,
        [`${prefix}%`]
    );

    let nextNumber = 1;
    if (rows.length > 0) {
        const last = rows[0].user_username;                 // e.g. TKURYQA007
        const lastNum = parseInt(last.slice(prefix.length), 10) || 0;
        nextNumber = lastNum + 1;
    }
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

// ---------- addUser: ใช้ pool + ใส่ backtick ชื่อตาราง ----------
async function addUser(userData) {
    const {
        first_name,
        last_name,
        branch,
        department,
        email,
        phone,
        laptop_no,
        avatar_url,
        status,
        reset,
    } = userData || {};

    if (!first_name || !last_name || !branch || !department) {
        throw new Error('missing required fields: first_name, last_name, branch, department');
    }

    const user_username = await generateUsername(branch, department);

    const hash = await bcrypt.hash('1234', 10);
    const user_status = typeof status === 'number' ? status : 1;
    const user_reset = typeof reset === 'number' ? reset : 0;

    const [result] = await pool.query(
        `INSERT INTO ticket_user
      (user_username,
       user_password,
       user_first_name,
       user_last_name,
       user_branch,
       user_department,
       user_email,
       user_phone,
       user_laptop_no,
       user_avatar_url,
       user_status,
       user_reset)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            user_username,
            hash,
            first_name,
            last_name,
            branch,
            department,
            email || null,
            phone || null,
            laptop_no || null,
            avatar_url || null,
            user_status,
            user_reset
        ]
    );

    return { user_id: result.insertId, user_username };
}
/* ----------------- */
app.get("/api/ping", (req, res) => {
    res.json({ ok: true, hasAuth: !!(req.headers.authorization || "").startsWith("Bearer ") });
});

app.post("/api/users", async (req, res) => {
    try {
        const user = await addUser(req.body);
        res.status(201).json({ success: true, ...user });
    } catch (err) {
        console.error('Add user error:', err);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.get("/api/me", requireAuthJWT, (req, res) => {
    res.json({ loggedIn: true, user: req.user });
});

/** ---------------- Utils ---------------- */
function categoryLabel(code) {
    const map = {
        PC: "💻 คอม/โน้ตบุ๊ก",
        PRN: "🖨️ เครื่องพิมพ์/สแกน",
        NET: "🌐 เครือข่าย",
        FORM: "📑 ฟอร์ม",
        SYS: "🛠️ Jobsheets",
        ERP: "📊 ERP",
        ACC: "🔑 บัญชีผู้ใช้/ไลเซนส์",
        OTH: "📦 อื่นๆ",
    };
    return map[code] || String(code || "").toUpperCase();
}


async function generateTicketCode(pool, branch) {
    const now = new Date();
    const y = String(now.getFullYear()).slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    const prefix = `T${branch}-${y}${m}${d}`;
    const [rows] = await pool.query(
        "SELECT code FROM ticket WHERE code LIKE ? ORDER BY id DESC LIMIT 1",
        [`${prefix}-%`]
    );
    let seq = 1;
    if (rows.length) {
        const last = parseInt(rows[0].code.split("-").pop(), 10);
        if (!Number.isNaN(last)) seq = last + 1;
    }
    return `${prefix}-${String(seq).padStart(3, "0")}`;
}

/** ---------------- Routes ---------------- */
// POST /api/login  { username, password, branch }
app.post("/api/login", async (req, res) => {
    const { username, password, branch } = req.body || {};
    if (!username || !password || !branch) {
        return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    try {
        const [rows] = await pool.query(
            `SELECT * FROM ticket_user 
       WHERE user_username = ? 
         AND user_status = 1
       LIMIT 1`,
            [username]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: "ไม่พบบัญชีผู้ใช้" });
        }
        const user = rows[0];
        const storedHash = user.user_password || "";

        let isMatch = false;
        if (storedHash.startsWith("$2")) {
            isMatch = await bcrypt.compare(password, storedHash);
        } else {
            const md5Hash = crypto.createHash("md5").update(password).digest("hex");
            isMatch = md5Hash === storedHash || password === storedHash;
        }
        if (!isMatch) return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });

        // update last login (best-effort)
        try {
            await pool.query("UPDATE ticket_user SET user_last_login = NOW() WHERE user_id = ?", [user.user_key]);
        } catch (e) {
            console.error("Update last login error:", e);
        }

        const token = signToken(user, branch);
        return res.json({
            message: "เข้าสู่ระบบสำเร็จ",
            token,
            user: {
                user_key: user.user_id,
                name: user.user_first_name,
                lastname: user.user_last_name,
                username: user.user_username,
                branch_log: user.user_branch,
                branch_current: branch,
                user_photo: user.user_avatar_url,
                u_role: user.user_role,
                u_department: user.user_department,
                user_language: 'TH',
                u_email: user.user_email,
                u_tel: user.user_phone,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Server error" });
    }
});

// GET /api/issues?q=&branch=&limit=20
app.get("/api/issues", requireAuthJWT, async (req, res) => {
    try {
        const { q = "", branch, limit = 20 } = req.query;
        if (!branch) return res.status(400).json({ error: "branch is required" });

        const like = `%${q}%`;
        const [rows] = await pool.query(
            `
      SELECT id, code, branch, requester, title, category, detail, note, status, assignee, created_at
      FROM ticket
      WHERE branch = ?
        AND (? = '' OR requester LIKE ? OR title LIKE ? OR category LIKE ? OR code LIKE ?)
      ORDER BY created_at DESC
      LIMIT ?
      `,
            [branch, q, like, like, like, like, Number(limit)]
        );

        const data = rows.map((r) => ({
            id: r.id,
            code: r.code,
            createdAt: r.created_at
                ? new Date(r.created_at).toLocaleString("th-TH", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                })
                : null,
            requester: r.requester,
            title: r.title,
            detail: r.detail,
            note: r.note,
            category: categoryLabel(r.category),
            status: r.status,
            assignee: r.assignee || "-",
        }));

        res.json(data);
    } catch (err) {
        console.error("GET /api/issues error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /api/issues  { title, requester, category, detail?, branch }
app.post("/api/issues", requireAuthJWT, async (req, res) => {
    try {
        const { title, requester, category, detail = "", branch, note = "", department } = req.body || {};
        if (!title || !requester || !category || !branch) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const code = await generateTicketCode(pool, branch);
        const creator = req.user?.username || "unknown";

        const [result] = await pool.query(
            `
      INSERT INTO ticket (code, branch, requester, title, category, detail, department, note, status, assignee, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEW', NULL, ?, NOW(), NOW())
      `,
            [code, branch, requester, title, category, detail, department, note, creator]
        );

        try {
            await pool.query(
                `INSERT INTO ticket_status_history (ticket_id, from_status, to_status, changed_by, changed_at)
         VALUES (?, ?, ?, ?, NOW())`,
                [result.insertId, null, "NEW", creator]
            );
        } catch (e) {
            console.warn("Insert history failed:", e.message);
        }

        res.json({
            id: result.insertId,
            code,
            createdAt: new Date(),
            requester,
            title,
            department,
            note,
            category,
            status: "NEW",
            assignee: "-",
        });
    } catch (err) {
        console.error("POST /api/issues error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// PATCH /api/issues/:id/status  { status, assignee?, note? }  (admin only)
app.patch("/api/issues/:id/status", requireAuthJWT, requireAdminJWT, async (req, res) => {
    try {
        const { id } = req.params;

        let { status, assignee, note = "" } = req.body || {};
        if (!status) return res.status(400).json({ error: "status is required" });

        const allowed = ["NEW", "IN_PROGRESS", "WAITING", "DONE", "CANCELLED"];
        if (!allowed.includes(status)) return res.status(400).json({ error: "invalid status" });

        // sanitize note
        if (typeof note !== "string") note = String(note ?? "");
        note = note.trim();
        if (note.length > 2000) {
            return res.status(400).json({ error: "note is too long (max 2000 chars)" });
        }

        const [cur] = await pool.query("SELECT status FROM ticket WHERE id = ?", [id]);
        if (!cur.length) return res.status(404).json({ error: "not found" });

        const fromStatus = cur[0].status;
        const changer = req.user?.username || "admin";
        if (!assignee && status !== "DONE") assignee = changer;

        // update main ticket
        await pool.query(
            `UPDATE ticket
         SET status = ?, assignee = ?, note = ?, updated_at = NOW()
       WHERE id = ?`,
            [status, assignee || null, note, id]
        );

        // write history (รวม note)
        try {
            await pool.query(
                `INSERT INTO ticket_status_history
           (ticket_id, from_status, to_status, note, changed_by, changed_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
                [id, fromStatus, status, note || null, changer]
            );
        } catch (e) {
            console.warn("Insert history failed:", e.message);
        }

        res.json({ id: Number(id), status, assignee: assignee || "-", note });
    } catch (err) {
        console.error("PATCH /api/issues/:id/status error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /api/saveTicket (multipart/form-data)
app.post("/api/saveTicket", requireAuthJWT, upload.single("file"), async (req, res) => {
    let conn;
    try {
        const {
            firstName = "",
            lastName = "",
            branch,
            category,
            tel = "",
            department = "",
            email = "",
            title = "",
            detail = "",
            source = "WEB",
            requester_id = "",
        } = req.body || {};

        if (!branch || !category) {
            return res.status(400).json({ message: "branch และ category จำเป็นต้องระบุ" });
        }

        const requester = `${firstName || ""} ${lastName || ""}`.trim() || req.user?.username || "unknown";
        /* const shortDetail = String(detail || "").replace(/\s+/g, " ").slice(0, 120);
        const title = `${categoryLabel(category)}${shortDetail ? " - " + shortDetail : ""}`.slice(0, 255); */
        const creator = req.user?.username || "unknown";

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const code = await generateTicketCode(pool, branch);

        const [result] = await conn.query(
            `
        INSERT INTO ticket
        (code, branch, requester, department, title, category, detail, status, assignee, created_by, created_at, updated_at)
        VALUES
        (?,    ?,      ?,     ?,     ?, ?,        ?,      'NEW', NULL,      ?,         NOW(),     NOW())
      `,
            [code, branch, requester, department, title, category, detail, creator]
        );

        const ticketId = result.insertId;

        let attachmentUrl = null;
        if (req.file) {
            attachmentUrl = `/uploads/ticket/${req.file.filename}`;
            await conn.query(
                `
          INSERT INTO ticket_attachment
          (ticket_id, file_name, file_path, mime_type, size, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `,
                [
                    ticketId,
                    req.file.originalname || req.file.filename,
                    attachmentUrl,
                    req.file.mimetype || null,
                    req.file.size || null,
                ]
            );
        }

        try {
            await conn.query(
                `INSERT INTO ticket_status_history (ticket_id, from_status, to_status, changed_by, changed_at)
         VALUES (?, ?, ?, ?, NOW())`,
                [ticketId, null, "NEW", creator]
            );
        } catch (e) {
            console.warn("Insert history failed:", e.message);
        }

        await conn.commit();

        const responsePayload = {
            id: ticketId,
            code,
            branch,
            requester,
            department,
            title,
            category,
            status: "NEW",
            assignee: "-",
            created_by: creator,
            created_at: new Date(),
            updated_at: new Date(),
            attachmentUrl,
            source,
            requester_id,
            tel,
            email,
        };

        res.json(responsePayload);
        // แจ้ง LINE แบบไม่บล็อก
        notifyLineByCategory(
            {
                code,
                title,
                category,
                requester,
                department,
                branch,
                detail,
                createdAt: responsePayload.created_at,
            },
            {
                publicUrl: null, // ถ้ามี URL public ใส่เพิ่มได้
            }
        );
        return;
    } catch (err) {
        if (conn) {
            try {
                await conn.rollback();
            } catch (_) { }
        }
        console.error("POST /api/saveTicket error:", err);
        if (err instanceof Error && /File too large|อนุญาตเฉพาะไฟล์รูปภาพ/.test(err.message)) {
            return res.status(400).json({ message: err.message });
        }
        return res.status(500).json({ message: "Server error" });
    } finally {
        if (conn) conn.release();
    }
});

// GET /api/issues/:id/attachments
app.get("/api/issues/:id/attachments", requireAuthJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT id, file_name, file_path AS url, mime_type, size, created_at
       FROM ticket_attachment
       WHERE ticket_id = ?
       ORDER BY id ASC`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error("GET /api/issues/:id/attachments error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ===================== GET /api/issues/:id (รายละเอียด + รูป + ไทม์ไลน์) =====================
app.get("/api/issues/:id", requireAuthJWT, async (req, res) => {
    try {
        const { id } = req.params;

        // 1) ดึง ticket หลัก + ข้อมูลผู้สร้างบางส่วน
        const [tRows] = await pool.query(
            `
      SELECT 
        ticket.id,
        ticket.code,
        ticket.branch,
        ticket.requester,
        ticket.title,
        ticket.category,
        ticket.detail,
        ticket.status,
        ticket.note,
        ticket.assignee,
        ticket.created_at,
        ticket.updated_at,
        u.username      AS user_username,
        u.name          AS user_name,
        u.lastname      AS user_lastname,
        u.u_tel         AS user_tel,
        u.u_email        AS user_email
      FROM ticket
      LEFT JOIN u_user AS u
        ON u.username COLLATE utf8mb4_unicode_ci
           = ticket.created_by COLLATE utf8mb4_unicode_ci
      WHERE ticket.id = ?
      LIMIT 1
      `,
            [id]
        );

        if (tRows.length === 0) return res.status(404).json({ message: "not found" });
        const t = tRows[0];

        const fmtTH = (dt) =>
            dt
                ? new Date(dt).toLocaleString("th-TH", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                })
                : null;

        // 2) รูปแนบ
        const [aRows] = await pool.query(
            `
      SELECT id, file_name, file_path AS url, mime_type, size, created_at
      FROM ticket_attachment
      WHERE ticket_id = ?
      ORDER BY id ASC
      `,
            [id]
        );

        const hostPrefix = `${req.protocol}://${req.headers.host}`;
        const images = aRows.map((r) => ({
            id: r.id,
            url: r.url?.startsWith("http") ? r.url : `${hostPrefix}${r.url}`,
            name: r.file_name || null,
            mime: r.mime_type || null,
            size: r.size || null,
            createdAt: fmtTH(r.created_at),
        }));

        // 3) ไทม์ไลน์สถานะ (คุณแก้ COLLATE ไว้ถูกแล้ว)
        const [hRows] = await pool.query(
            `
      SELECT h.from_status, h.to_status, h.changed_by, h.changed_at, h.note,
             CONCAT(COALESCE(u.name,''), 
                    CASE WHEN COALESCE(u.lastname,'') <> '' 
                         THEN CONCAT(' ', u.lastname) 
                         ELSE '' END) AS changer_fullname
      FROM ticket_status_history AS h
      LEFT JOIN u_user AS u
        ON u.username COLLATE utf8mb4_unicode_ci
           = h.changed_by COLLATE utf8mb4_unicode_ci
      WHERE h.ticket_id = ?
      ORDER BY h.changed_at ASC, h.id ASC
      `,
            [id]
        );

        const logs = hRows.map((r) => ({
            from_status: r.from_status,
            to_status: r.to_status,
            changed_by: r.changed_by,
            changed_by_name: r.changer_fullname || r.changed_by,
            changed_at: fmtTH(r.changed_at),
            note: r.note || null,
        }));

        // 4) payload
        const data = {
            id: t.id,
            code: t.code,
            branch: t.branch,
            requester: t.requester,
            requester_tel: null,
            title: t.title,
            detail: t.detail,
            category: categoryLabel(t.category),
            status: t.status,
            assignee: t.assignee,
            u_email: t.user_email,
            note: t.note,
            createdAt: fmtTH(t.created_at),
            updatedAt: fmtTH(t.updated_at),
            images,
            logs,
            publicUrl: null,
            tel: t.user_tel ?? null, // จาก u_user.u_tel
            created_by_username: t.user_username ?? null,
            created_by_name: [t.user_name, t.user_lastname].filter(Boolean).join(" ") || null,
            created_at: t.created_at,
        };

        return res.json(data);

    } catch (err) {
        console.error("GET /api/issues/:id error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});

app.listen(4000, () => console.log("Server running on port 4000"));
