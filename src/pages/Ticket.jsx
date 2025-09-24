// =============================
// file: src/pages/Ticket.jsx
// =============================
import React, { useEffect, useMemo, useState } from "react";
import {
    AppBar, Avatar, Box, Button, Card, CardContent, Chip, Container,
    FormControl, Grid, IconButton, InputAdornment, LinearProgress,
    OutlinedInput, Stack, Toolbar, Tooltip, Typography,
    Tabs, Tab
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddUserDialog from "../components/AddUserDialog.jsx";
import {
    UserPlus, Plus, Search, ClipboardList, Home, RefreshCw, Pencil, CheckCheck, ShieldCheck
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/th";
import axios from "axios";
import Swal from "sweetalert2";
import NewIssueDialog from "../components/NewIssueDialog.jsx";
import AdminStatusDialog from "../components/AdminStatusDialog.jsx";
import IssueDetailDialog from "../components/IssueDetailDialog.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogOut } from "lucide-react";
dayjs.locale("th");
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const STATUS = {
    NEW: { key: "NEW", label: "รอตรวจสอบ", color: "warning" },
    IN_PROGRESS: { key: "IN_PROGRESS", label: "กำลังดำเนินการ", color: "info" },
    WAITING: { key: "WAITING", label: "รออะไหล่/ผู้รับผิดชอบ", color: "secondary" },
    DONE: { key: "DONE", label: "ดำเนินการเสร็จแล้ว", color: "success" },
    CANCELLED: { key: "CANCELLED", label: "ยกเลิก", color: "default" },
};

function StatusChip({ value }) {
    const s = STATUS[value] || STATUS.NEW;
    return (
        <Chip
            size="small"
            label={s.label}
            color={s.color}
            variant={s.key === "NEW" ? "outlined" : "filled"}
        />
    );
}

export default function Ticket() {
    const [addUserOpen, setAddUserOpen] = useState(false);
    const [statusTab, setStatusTab] = useState("ALL");
    const API_HOST = import.meta.env.VITE_API_HOST;
    const navigate = useNavigate();

    // --- axios instance ที่แนบ Bearer token อัตโนมัติ ---
    const apiHttp = useMemo(() => {
        const inst = axios.create({ baseURL: API_HOST });
        inst.interceptors.request.use((cfg) => {
            const t = sessionStorage.getItem("usvt_token");
            if (t) cfg.headers.Authorization = `Bearer ${t}`;
            return cfg;
        });
        inst.interceptors.response.use(
            (r) => r,
            (err) => {
                if (err?.response?.status === 401) {
                    sessionStorage.removeItem("usvt_token");
                    sessionStorage.removeItem("usvt_user_key");
                    sessionStorage.removeItem("usvt_username");
                    sessionStorage.removeItem("usvt_role");
                    sessionStorage.removeItem("usvt_branch");
                    sessionStorage.removeItem("usvt_branch_db");
                    sessionStorage.removeItem("usvt_email");
                    sessionStorage.removeItem("usvt_name");
                    sessionStorage.removeItem("usvt_lastname");
                    sessionStorage.removeItem("usvt_tel");
                    window.location.href = "/login";
                }
                return Promise.reject(err);
            }
        );
        return inst;
    }, [API_HOST]);

    // --- API wrapper ใช้ instance เดียวกันทั้งหมด ---
    const api = useMemo(() => ({
        async list({ q = "", branch }) {
            const res = await apiHttp.get("/api/issues", {
                params: { q, branch, limit: 1000 },
            });
            return res.data;
        },
        async updateStatus(id, body) {
            const res = await apiHttp.patch(`/api/issues/${id}/status`, body);
            return res.data;
        },
        async saveTicket(formData) {
            const res = await apiHttp.post("/api/saveTicket", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return res.data;
        },
        async logout() {
            // ถ้าเซิร์ฟเวอร์มี /api/logout และอยากเรียกก็ใช้ได้
            try { await apiHttp.post("/api/logout"); } catch { }
        },
    }), [apiHttp]);

    const [role] = useState(() => sessionStorage.getItem("usvt_role") || "member");
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openNew, setOpenNew] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editRow, setEditRow] = useState(null);
    const [detailId, setDetailId] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const me = useMemo(() => ({
        id: sessionStorage.getItem("usvt_user_key") || "guest",
        name: sessionStorage.getItem("usvt_username") || "Guest",
        branch: sessionStorage.getItem("usvt_branch") || import.meta.env.VITE_DEFAULT_BRANCH || "URY",
        role,
    }), [role]);

    useEffect(() => {
        // ถ้าไม่มี token หรือยังไม่ล็อกอิน -> กลับไป login
        const token = sessionStorage.getItem("usvt_token");
        if (!token || !sessionStorage.getItem("usvt_user_key")) {
            navigate("/login", { replace: true });
            return;
        }
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const qid = searchParams.get("issueId");
        if (qid && qid !== String(detailId)) {
            openDetail(qid, /* replace */ true); // ไม่ดัน history ซ้ำ
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);
    useEffect(() => {
        const u = searchParams.get("updateStatus");
        if (u && (!editRow || String(editRow.id) !== String(u))) {
            openEdit(u, /* replace */ true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, rows]);

    async function refresh() {
        setLoading(true);
        try {
            const data = await api.list({ q: search, branch: me.branch });
            setRows(data);
        } finally {
            setLoading(false);
        }
    }

    function openDetail(id, replace = false) {
        setDetailId(String(id));
        const sp = new URLSearchParams(searchParams);
        sp.set("issueId", String(id));
        setSearchParams(sp, { replace });
    }

    function closeDetail() {
        setDetailId(null);
        const sp = new URLSearchParams(searchParams);
        sp.delete("issueId");
        setSearchParams(sp, { replace: true });
    }

    function openEdit(id, replace = false) {
        // ไม่ต้องหา row เต็ม ๆ แล้ว ส่งแค่ id ก็พอ
        setEditRow({ id: String(id) });

        const sp = new URLSearchParams(searchParams);
        sp.set("updateStatus", String(id));
        setSearchParams(sp, { replace });



    }

    function closeEdit() {
        setEditRow(null);
        const sp = new URLSearchParams(searchParams);
        sp.delete("updateStatus");
        setSearchParams(sp, { replace: true });
    }

    // helper: แปลง "DD/MM/BBBB HH:mm" (BBBB = ปีพ.ศ.) → dayjs()
    const parseThaiDateToDayjs = (s) => {
        if (!s) return null;
        // รองรับ 1-2 หลักสำหรับวัน/เดือน และ 24 ชม.
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
        if (!m) {
            // ถ้าไม่ตรงแพทเทิร์น ลองให้ dayjs เดา (กันพัง)
            return dayjs(s);
        }
        let [, dd, MM, yyyyTH, HH, mm] = m;
        const yyyyAD = String(parseInt(yyyyTH, 10) - 543);   // แปลง พ.ศ. → ค.ศ.
        dd = dd.padStart(2, "0");
        MM = MM.padStart(2, "0");
        HH = HH.padStart(2, "0");
        // สร้างสตริงแบบชัดเจน แล้ว parse ด้วย format
        return dayjs(`${yyyyAD}-${MM}-${dd} ${HH}:${mm}`, "YYYY-MM-DD HH:mm");
    };
    const counts = useMemo(() => ({
        total: rows.length,
        today: rows.filter((r) => {
            const d = parseThaiDateToDayjs(r.createdAt);
            return d && d.isSame(dayjs(), "day");
        }).length,
    }), [rows]);

    function TabLabel({ text, count }) {
        return (
            <Stack direction="row" spacing={1} alignItems="center">
                <span>{text}</span>
                <Chip size="small" label={count ?? 0} />
            </Stack>
        );
    }
    const statusCounts = useMemo(() => {
        const base = { ALL: rows.length, NEW: 0, IN_PROGRESS: 0, WAITING: 0, DONE: 0, CANCELLED: 0 };
        for (const r of rows) {
            if (base[r.status] !== undefined) base[r.status]++;
        }
        return base;
    }, [rows]);

    // กรองแถวตามแท็บสถานะ
    const filteredRows = useMemo(() => {
        if (statusTab === "ALL") return rows;
        return rows.filter((r) => r.status === statusTab);
    }, [rows, statusTab]);

    const columns = [
        { field: "code", headerName: "รหัส", width: 140, renderCell: (p) => <Typography variant="caption">{p.value}</Typography> },
        { field: "createdAt", headerName: "วันที่", width: 160, },
        { field: "requester", headerName: "ชื่อผู้แจ้ง", width: 180 },
        { field: "detail", headerName: "รายการ/อาการ", flex: 1, minWidth: 220 },
        { field: "category", headerName: "หมวด", width: 130 },
        { field: "status", headerName: "สถานะ", width: 160, renderCell: (p) => <StatusChip value={p.value} /> },
        {
            field: "_action",
            headerName: "จัดการ",
            width: 180,
            sortable: false,
            filterable: false,
            renderCell: (p) => (
                <Stack direction="row" spacing={1}>
                    {/* ปุ่มดูรายละเอียด ทุก role ใช้ได้ */}
                    <Tooltip title="ดูรายละเอียดรูป/อาการทั้งหมด">
                        <IconButton size="small" onClick={() => openDetail(p.row.id)}>
                            <ClipboardList size={16} />
                        </IconButton>
                    </Tooltip>
                    {/* ปุ่มสำหรับ admin เท่านั้น */}
                    {role === "admin" && (
                        <>
                            <Tooltip title="อัพเดทสถานะ">
                                <IconButton size="small" onClick={() => openEdit(p.row.id)}>
                                    <Pencil size={16} />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="ปิดงานเร็ว">
                                <IconButton
                                    size="small"
                                    onClick={() => setEditRow({ id: String(p.row.id), quickDone: true })}
                                >
                                    <CheckCheck size={16} />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                </Stack>
            )
        },
    ].filter(Boolean);

    async function handleLogout() {
        try { await api.logout(); } catch { }
        // ล้าง client state แล้วกลับไป login
        sessionStorage.removeItem("usvt_token");
        sessionStorage.removeItem("usvt_user_key");
        sessionStorage.removeItem("usvt_username");
        sessionStorage.removeItem("usvt_role");
        sessionStorage.removeItem("usvt_branch");
        sessionStorage.removeItem("usvt_branch_db");
        sessionStorage.removeItem("usvt_email");
        sessionStorage.removeItem("usvt_name");
        sessionStorage.removeItem("usvt_lastname");
        sessionStorage.removeItem("usvt_tel");
        navigate("/login", { replace: true });
    }

    return (
        <Box>
            <AppBar position="sticky" elevation={0} sx={{ bgcolor: "white", borderBottom: "1px solid #eee" }}>
                <Toolbar>
                    <Home size={20} />
                    <img src="U-LOGO.png" alt="" style={{ height: 50 }} />
                    <Box flexGrow={1} />
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Chip label={`สาขา: ${me.branch}`} size="small" />
                        <Chip label={`role: ${me.role}`} size="small" color={me.role === "admin" || me.role === "developer" ? "primary" : "default"} />
                        <Tooltip title="รีเฟรชข้อมูล"><IconButton onClick={refresh}><RefreshCw /></IconButton></Tooltip>
                        {role === "admin" && (
                            <Tooltip title="เพิ่มผู้ใช้งาน">
                                <IconButton onClick={() => setAddUserOpen(true)}>
                                    <UserPlus />
                                </IconButton>
                            </Tooltip>
                        )}
                        <AddUserDialog
                            open={addUserOpen}
                            onClose={() => setAddUserOpen(false)}
                        />
                        <Avatar sx={{ width: 28, height: 28 }}>{(me.name || "U").slice(0, 1)}</Avatar>
                        <Tooltip title="ออกจากระบบ">
                            <IconButton onClick={handleLogout}><LogOut /></IconButton>
                        </Tooltip>
                    </Stack>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ py: 3 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                        <Card sx={{ height: "100%" }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{ p: 1.2, bgcolor: `#ff8a0022`, borderRadius: 2 }}>
                                        <img src="it.png" alt="" style={{ height: 50 }} />
                                        {/* <ClipboardList size={28} /> */}
                                    </Box>
                                    <Box>
                                        <Typography fontWeight={700}>รายการแจ้งทั้งหมด</Typography>
                                        <Typography color="secondary" variant="h4" fontWeight={800}>{counts.total}</Typography>
                                        <Typography variant="body2" color="text.secondary">เรคคอร์ด</Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                        <Card sx={{ height: "100%" }}>
                            <CardContent>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{ p: 1.2, bgcolor: `#ff6a0022`, borderRadius: 2 }}>
                                        {/* <ShieldCheck size={28} /> */}
                                        <img src="it.png" alt="" style={{ height: 50 }} />
                                    </Box>
                                    <Box>
                                        <Typography fontWeight={700}>รายการวันนี้</Typography>
                                        <Typography color="success" variant="h4" fontWeight={800}>{counts.today}</Typography>
                                        <Typography variant="body2" color="text.secondary">{dayjs().format("DD MMM YYYY")}</Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 4 }}>
                        <Card sx={{ height: "100%" }}>
                            <CardContent>
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                    <Button fullWidth variant="contained" startIcon={<Plus />} onClick={() => setOpenNew(true)}>
                                        เพิ่มเรื่องแจ้ง
                                    </Button>
                                    <FormControl size="small" fullWidth>
                                        <OutlinedInput
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && refresh()}
                                            placeholder="ระบุชื่อ/เบอร์/รายละเอียด เพื่อค้นหา"
                                            startAdornment={<InputAdornment position="start"><Search size={18} /></InputAdornment>}
                                        />
                                    </FormControl>
                                    <Tooltip title="รีเฟรช">
                                        <IconButton onClick={refresh}><RefreshCw /></IconButton>
                                    </Tooltip>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <Box mt={2} />
                {/* ───── แถบสถานะ + ตัวเลขนับ ───── */}
                <Card sx={{ mb: 2 }}>
                    <CardContent sx={{ pt: 1 }}>
                        <Tabs
                            value={statusTab}
                            onChange={(_e, v) => setStatusTab(v)}
                            variant="scrollable"
                            allowScrollButtonsMobile
                        >
                            <Tab
                                value="ALL"
                                label={<TabLabel text="ทั้งหมด" count={statusCounts.ALL} />}
                            />
                            <Tab
                                value="NEW"
                                label={<TabLabel text={STATUS.NEW.label} count={statusCounts.NEW} />}
                            />
                            <Tab
                                value="IN_PROGRESS"
                                label={<TabLabel text={STATUS.IN_PROGRESS.label} count={statusCounts.IN_PROGRESS} />}
                            />
                            <Tab
                                value="WAITING"
                                label={<TabLabel text={STATUS.WAITING.label} count={statusCounts.WAITING} />}
                            />
                            <Tab
                                value="DONE"
                                label={<TabLabel text={STATUS.DONE.label} count={statusCounts.DONE} />}
                            />
                            <Tab
                                value="CANCELLED"
                                label={<TabLabel text={STATUS.CANCELLED.label} count={statusCounts.CANCELLED} />}
                            />
                        </Tabs>
                    </CardContent>
                </Card>

                <Card>
                    {loading && <LinearProgress />}
                    <CardContent>
                        <Typography fontWeight={700} gutterBottom>รายการแจ้ง 1000 อันดับล่าสุด</Typography>
                        <div style={{ height: 560, width: "100%" }}>
                            <DataGrid
                                rows={filteredRows}
                                columns={columns}
                                getRowId={(r) => r.id}
                                disableRowSelectionOnClick
                                density="compact"
                                pageSizeOptions={[10, 20, 50]}
                                initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </Container>

            <NewIssueDialog
                open={openNew}
                onClose={() => setOpenNew(false)}
                loading={creating}
                onSubmit={async (fd) => {
                    setOpenNew(false);
                    setCreating(true);
                    try {
                        // บังคับ branch จาก session
                        fd.set("branch", me.branch);
                        fd.set("source", "WEB");
                        fd.set("requester_id", String(me.id || ""));

                        await api.saveTicket(fd);

                        await Swal.fire({ icon: "success", title: "บันทึกสำเร็จ" });
                        await refresh();
                    } catch (err) {
                        const msg = err?.response?.data?.message || err.message || "เกิดข้อผิดพลาดในการบันทึก";
                        await Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: msg });
                        setOpenNew(true);
                        throw err;
                    } finally {
                        setCreating(false);
                    }
                }}
            />


            <AdminStatusDialog
                open={!!editRow}
                issueId={editRow?.id}
                apiHttp={apiHttp}
                quickDone={!!editRow?.quickDone}
                onClose={closeEdit}
                onSubmit={async ({ status, assignee, note }) => {
                    try {
                        // 1) อัพเดทสถานะ
                        await api.updateStatus(editRow.id, { status, assignee, note });

                        // 2) ปิด modal ก่อนเลย
                        closeEdit();
                        if (!assignee || assignee === "-") {
                            Swal.fire({
                                icon: "warning",
                                title: "กรุณาเลือกผู้รับผิดชอบ",
                                text: "ต้องระบุชื่อผู้รับผิดชอบก่อนบันทึก",
                                confirmButtonText: "ตกลง",
                            }).then(() => {
                                setEditRow(editRow);
                            });
                            return;
                        }
                        // 4) ค่อยแสดง swal
                        Swal.fire({
                            icon: "success",
                            title: "อัพเดทสถานะเรียบร้อย",
                            text: "ข้อมูลถูกบันทึกแล้ว",
                            confirmButtonText: "OK",
                        }).then(() => {
                            refresh();
                        });
                    } catch (err) {
                        console.error(err);
                        closeEdit(); // ถ้าอยากให้ปิด modal แม้ error ก็ใส่ตรงนี้
                        Swal.fire({
                            icon: "error",
                            title: "บันทึกไม่สำเร็จ",
                            text: "กรุณาลองใหม่อีกครั้ง",
                        });
                    }
                }}
                disabled={role !== "admin"}
            />


            <IssueDetailDialog
                open={!!detailId}
                issueId={detailId}              // ส่งค่าจากหน้านี้
                onClose={closeDetail}           // ปิดแล้วเอา ?issueId ออกจาก URL
                apiHttp={apiHttp}
                parseThaiDateToDayjs={parseThaiDateToDayjs}
            />
        </Box>
    );
}
