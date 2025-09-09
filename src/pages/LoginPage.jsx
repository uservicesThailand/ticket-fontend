// LoginPage.jsx
import React, { useEffect, useState } from "react";
import {
    Box, Button, TextField, Typography, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem, Stack, Chip
} from "@mui/material";
import axios from "axios";

const BRANCHES = [
    { code: "URY", name: "ระยอง" },
    { code: "USB", name: "สระบุรี" },
    { code: "UCB", name: "ชลบุรี" },
    { code: "UPB", name: "ปราจีนบุรี" },
    { code: "USR", name: "สระบุรี" },
    { code: "UKK", name: "ขอนแก่น" },
];

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [branch, setBranch] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // ล้าง token/Authorization ตอนเข้าหน้า login เพื่อกัน header เก่าติดไปกับ /api/login
    useEffect(() => {
        sessionStorage.removeItem("usvt_token");
        try { delete axios.defaults.headers.common.Authorization; } catch { }
    }, []);

    const handleLogin = async () => {
        setError("");
        if (!username || !password || !branch) {
            setError("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        try {
            setLoading(true);

            // ใช้ instance เปล่าสำหรับ login เพื่อชัวร์ว่าไม่มี Authorization ติดไป
            const http = axios.create({ baseURL: import.meta.env.VITE_API_HOST });

            const res = await http.post("/api/login", { username, password, branch });

            // ดึง token + user (ถ้ามี token)
            const token = res.data?.token;
            const u = res.data?.user || {};

            if (token) {
                sessionStorage.setItem("usvt_token", token);
                axios.defaults.headers.common.Authorization = `Bearer ${token}`;
            }

            // เก็บโปรไฟล์ผู้ใช้ + branch ที่เลือก (ใช้ต่อในหน้าอื่น)
            sessionStorage.setItem("usvt_user_key", u.user_key || "");
            sessionStorage.setItem("usvt_department", u.u_department || "");
            sessionStorage.setItem("usvt_username", u.username || "");
            sessionStorage.setItem("usvt_role", u.u_role || "member");
            sessionStorage.setItem("usvt_branch_db", u.branch_log || "");
            sessionStorage.setItem("usvt_branch", branch);
            sessionStorage.setItem("usvt_email", u.u_email || "");
            sessionStorage.setItem("usvt_name", u.name || "");
            sessionStorage.setItem("usvt_lastname", u.lastname || "");
            sessionStorage.setItem("usvt_tel", u.u_tel || "");

            // ไปหน้า ticket
            window.location.href = "/ticket";
        } catch (err) {
            setError(err.response?.data?.error || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter") handleLogin();
    };

    return (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
            <Card sx={{ p: 4, width: 360 }}>
                <CardContent>
                    <Typography textAlign="center" gutterBottom >
                        <img src="itsup.png" alt="" style={{ height: 200 }} />
                    </Typography>
                    <Stack alignItems="center">
                        <Chip label="เข้าระบบแจ้งปัญหา IT" color="primary" variant="outlined" />
                    </Stack>
                    <TextField
                        label="Username"
                        fullWidth
                        margin="normal"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={onKeyDown}
                    />

                    <TextField
                        label="Password"
                        type="password"
                        fullWidth
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={onKeyDown}
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel id="branch-label">Branch</InputLabel>
                        <Select
                            labelId="branch-label"
                            label="Branch"
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                        >
                            {BRANCHES.map((b) => (
                                <MenuItem key={b.code} value={b.code}>
                                    {b.code} — {b.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {error && (
                        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                            {error}
                        </Typography>
                    )}

                    <Button
                        variant="contained"
                        color="warning"
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                    </Button>
                    <Typography variant="caption">
                        © 2025 Ticket By MIS TEAM
                    </Typography>
                </CardContent>
            </Card>
        </Box >
    );
}
