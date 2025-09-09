// =============================
// file: src/components/NewIssueDialog.jsx
// =============================
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button, Stack, Typography } from "@mui/material";

const CATEGORIES = [
    { value: "PC", label: "คอมพิวเตอร์/โน้ตบุ๊ก" },
    { value: "PRN", label: "เครื่องพิมพ์/สแกนเนอร์" },
    { value: "NET", label: "เครือข่าย/อินเทอร์เน็ต" },
    { value: "SYS", label: "ระบบงานภายใน (Jobsheet)" },
    { value: "FORM", label: "การใช้งาน Form" },
    { value: "ERP", label: "การใช้งาน ERP" },
    { value: "ACC", label: "บัญชีใช้งาน/ไลเซนส์" },
    { value: "OTH", label: "อื่นๆ" },
];

const BRANCHES = ["URY", "USB", "UCB", "UPB", "UMC", "USR", "UKK"];

export default function NewIssueDialog({ open, onClose, onSubmit, loading }) {
    const defaults = {
        firstName: sessionStorage.getItem("usvt_name") || sessionStorage.getItem("usvt_username") || "",
        lastName: sessionStorage.getItem("usvt_lastname") || "",
        department: sessionStorage.getItem("usvt_department") || "",
        branch: sessionStorage.getItem("usvt_branch") || import.meta.env.VITE_DEFAULT_BRANCH || "URY",
        category: "",
        tel: sessionStorage.getItem("usvt_tel") || "",
        email: sessionStorage.getItem("usvt_email") || "",
        detail: "",
    };
    const [form, setForm] = useState(defaults);
    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null); const [errors, setErrors] = useState({});

    function handleChange(field, value) { setForm((s) => ({ ...s, [field]: value })); }

    function handleFileChange(e) {
        const f = e.target.files?.[0] ?? null;
        if (!f) {
            setFile(null);
            setFilePreview(null);
            return;
        }
        //  ตรวจชนิดไฟล์เบื้องต้น (อนุญาตเฉพาะ image/*)
        if (!f.type.startsWith("image/")) {
            setErrors((prev) => ({ ...prev, file: "อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น" }));
            e.target.value = "";
            return;
        }
        //  จำกัดขนาดไฟล์ (ตัวอย่าง 5MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (f.size > MAX_SIZE) {
            setErrors((prev) => ({ ...prev, file: "ไฟล์ต้องไม่เกิน 5 MB" }));
            e.target.value = "";
            return;
        }
        setErrors((prev) => ({ ...prev, file: undefined }));
        setFile(f);
        setFilePreview(URL.createObjectURL(f));
    }

    function validate() {
        const e = {};
        if (!form.firstName) e.firstName = "กรอกชื่อ";
        if (!form.lastName) e.lastName = "กรอกนามสกุล";
        if (!form.category) e.category = "เลือกปัญหาที่เกี่ยวกับ";
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "อีเมลไม่ถูกต้อง";
        if (form.tel && !/^\d{8,12}$/.test(form.tel)) e.tel = "เบอร์ 8-12 หลัก";
        if (!form.detail) e.detail = "โปรดระบุรายละเอียด";
        if (!form.department) e.department = "โปรดกรอกชื่อแผนก";
        setErrors(e); return Object.keys(e).length === 0;
    }

    async function submit() {
        if (!validate()) return;
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
        if (file) fd.append("file", file, file.name);
        await onSubmit(fd);
        setForm(defaults);
        setFile(null);
        if (filePreview) URL.revokeObjectURL(filePreview);
        setFilePreview(null);
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>เพิ่มรายการแจ้ง</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} mt={0.5}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            variant="filled"
                            slotProps={{
                                input: {
                                    readOnly: true,
                                },
                            }}
                            label="ชื่อผู้แจ้ง:" value={form.firstName} onChange={(e) => handleChange("firstName", e.target.value)} fullWidth error={!!errors.firstName} helperText={errors.firstName} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            variant="filled"
                            slotProps={{
                                input: {
                                    readOnly: true,
                                },
                            }}
                            label="นามสกุล:"
                            value={form.lastName}
                            onChange={(e) => handleChange("lastName", e.target.value)}
                            fullWidth error={!!errors.lastName}
                            helperText={errors.lastName} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            variant="filled"
                            slotProps={{
                                input: {
                                    readOnly: true,
                                },
                            }}
                            label="แผนก:"
                            value={form.department}
                            onChange={(e) => handleChange("department", e.target.value)}
                            fullWidth error={!!errors.department}
                            helperText={errors.department} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                            <InputLabel>สาขา:</InputLabel>
                            <Select label="สาขา" value={form.branch} onChange={(e) => handleChange("branch", e.target.value)}>
                                {BRANCHES.map((b) => (<MenuItem key={b} value={b}>{b}</MenuItem>))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            label="หมายเลขโทรศัพท์:"
                            type="tel"
                            value={form.tel}
                            onChange={(e) => handleChange("tel", e.target.value)}
                            fullWidth
                            error={!!errors.tel}
                            helperText={errors.tel}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            label="อีเมล:" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} fullWidth error={!!errors.email} helperText={errors.email} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth error={!!errors.category}>
                            <InputLabel>ปัญหาเกี่ยวกับ:</InputLabel>
                            <Select label="ปัญหาเกี่ยวกับ" value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
                                <MenuItem value="" disabled>กรุณาระบุ</MenuItem>
                                {CATEGORIES.map((c) => (<MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField label="เลขเครื่อง:" placeholder="กรุณาระบุหมายเลขเครื่อง (บนสติ๊กเกอร์ เช่น UST-BKK-PSC-XXX)" value={form.title} onChange={(e) => handleChange("title", e.target.value)} fullWidth error={!!errors.title} helperText={errors.title} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField label="รายละเอียด:" placeholder="กรุณาระบุรายละเอียดให้ชัดเจน" value={form.detail} onChange={(e) => handleChange("detail", e.target.value)} multiline minRows={4} fullWidth error={!!errors.detail} helperText={errors.detail} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                            <Button component="label" variant="outlined">
                                แนบรูปภาพ:
                                <input
                                    hidden
                                    type="file"
                                    accept="image/*"                // รับเฉพาะรูป
                                    onChange={handleFileChange}
                                />
                            </Button>
                            <Stack spacing={0.5}>
                                <Typography variant="body2" color={errors.file ? "error" : "text.secondary"}>
                                    {file ? file.name : "ยังไม่ได้เลือกรูป"}
                                </Typography>
                                {errors.file && (
                                    <Typography variant="caption" color="error">{errors.file}</Typography>
                                )}
                                {filePreview && (
                                    <img
                                        src={filePreview}
                                        alt="preview"
                                        style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }}
                                    />
                                )}
                            </Stack>
                        </Stack>
                    </Grid>

                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 2, py: 1.5 }}>
                <Button onClick={onClose}>ปิด</Button>
                <Button variant="contained" onClick={submit} disabled={loading}>
                    ยื่นคำขอ
                </Button>
            </DialogActions>
        </Dialog>
    );
}
