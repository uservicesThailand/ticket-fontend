// AddUserDialog.jsx
import { useMemo, useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, MenuItem, Box, Typography, IconButton
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const required = (v) => (v?.toString().trim() ? "" : "กรุณากรอกข้อมูล");
const isEmail = (v) =>
    !v || /^[^\s@]+@[^\s@]+$/.test(v) ? "" : "รูปแบบอีเมลไม่ถูกต้อง";
const isPhone = (v) =>
    !v || /^[0-9+\-\s]{6,20}$/.test(v) ? "" : "รูปแบบเบอร์โทรไม่ถูกต้อง";

const API_HOST = import.meta.env.VITE_API_HOST;
async function postUser(payload) {
    const res = await fetch(`${API_HOST}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data; // { success, user_id, user_username }
}

export default function AddUserDialog({
    open,
    onClose,
    onSave,
    branches = ["URY", "UBK", "USB", "UCB", "UPB", "UMC", "USR", "UKK"],
    initialValues
}) {
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        branch: "",
        department: "",
        email: "",
        phone: "",
        laptopNo: ""
    });
    const [touched, setTouched] = useState({});
    const [successInfo, setSuccessInfo] = useState(null); // เก็บ user ที่สร้างเสร็จ

    const departments = [
        { value: "QA", label: "Quality Assurance" },
        { value: "MC", label: "Machine" },
        { value: "QC", label: "Quality Control" },
        { value: "RW", label: "Re-Winding" },
        { value: "WD", label: "Welding" },
        { value: "PN", label: "Planning" },
        { value: "PT", label: "Painting" },
        { value: "ME", label: "Mechanical" },
        { value: "CS", label: "Customer Service" },
        { value: "MIS", label: "Management Information System" },
        { value: "ACC", label: "Accounting" },
        { value: "HR", label: "Human Resources" }
    ];

    useEffect(() => {
        if (open) {
            setForm({
                firstName: initialValues?.firstName || "",
                lastName: initialValues?.lastName || "",
                branch: initialValues?.branch || "",
                department: initialValues?.department || "",
                email: initialValues?.email || "",
                phone: initialValues?.phone || "",
                laptopNo: initialValues?.laptopNo || ""
            });
            setTouched({});
        }
    }, [open, initialValues]);

    const errors = useMemo(() => {
        return {
            firstName: required(form.firstName),
            lastName: required(form.lastName),
            branch: required(form.branch),
            department: required(form.department),
            email: required(form.email) || isEmail(form.email),
            phone: isPhone(form.phone),
            laptopNo: ""
        };
    }, [form]);

    const hasError = Object.values(errors).some((e) => e);

    const handleChange = (key) => (e) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

    const markTouched = (key) => () =>
        setTouched((prev) => ({ ...prev, [key]: true }));

    const handleSubmit = async () => {
        setTouched({
            firstName: true, lastName: true, branch: true,
            department: true, email: true, phone: true, laptopNo: true
        });
        if (!hasError) {
            const payload = {
                first_name: form.firstName.trim(),
                last_name: form.lastName.trim(),
                branch: form.branch,
                department: form.department,
                email: form.email.trim(),
                phone: form.phone.trim(),
                laptop_no: form.laptopNo.trim()
            };
            try {
                const result = await postUser(payload);
                onSave?.(result);
                // โชว์ Dialog success พร้อม username / password
                setSuccessInfo({
                    username: result.user_username,
                    password: "1234" // รหัส default
                });
            } catch (err) {
                console.error("Create user failed:", err);
                alert(err?.message || "บันทึกไม่สำเร็จ");
            }
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text).catch(() => { });
    };

    const handleCloseSuccess = () => {
        setSuccessInfo(null);
        onClose?.();
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" onKeyDown={handleKeyDown}>
                <DialogTitle>เพิ่มผู้ใช้งาน</DialogTitle>
                <DialogContent dividers>
                    <Box mt={1}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="ชื่อ"
                                    value={form.firstName}
                                    onChange={handleChange("firstName")}
                                    onBlur={markTouched("firstName")}
                                    error={touched.firstName && !!errors.firstName}
                                    helperText={touched.firstName && errors.firstName}
                                    fullWidth
                                    autoFocus
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="นามสกุล"
                                    value={form.lastName}
                                    onChange={handleChange("lastName")}
                                    onBlur={markTouched("lastName")}
                                    error={touched.lastName && !!errors.lastName}
                                    helperText={touched.lastName && errors.lastName}
                                    fullWidth
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    select
                                    label="สาขา"
                                    value={form.branch}
                                    onChange={handleChange("branch")}
                                    onBlur={markTouched("branch")}
                                    error={touched.branch && !!errors.branch}
                                    helperText={touched.branch && errors.branch}
                                    fullWidth
                                >
                                    {branches.map((b) => (
                                        <MenuItem key={b} value={b}>{b}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    select
                                    label="แผนก"
                                    value={form.department}
                                    onChange={handleChange("department")}
                                    onBlur={markTouched("department")}
                                    error={touched.department && !!errors.department}
                                    helperText={touched.department && errors.department}
                                    fullWidth
                                >
                                    {departments.map((d) => (
                                        <MenuItem key={d.value} value={d.value}>
                                            {d.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="อีเมล"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange("email")}
                                    onBlur={markTouched("email")}
                                    error={touched.email && !!errors.email}
                                    helperText={touched.email && errors.email}
                                    fullWidth
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="เบอร์โทร"
                                    value={form.phone}
                                    onChange={handleChange("phone")}
                                    onBlur={markTouched("phone")}
                                    error={touched.phone && !!errors.phone}
                                    helperText={touched.phone && errors.phone}
                                    fullWidth
                                    inputProps={{ inputMode: "tel" }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="เลขเครื่องโน้ตบุ๊ก"
                                    value={form.laptopNo}
                                    onChange={handleChange("laptopNo")}
                                    onBlur={markTouched("laptopNo")}
                                    error={touched.laptopNo && !!errors.laptopNo}
                                    helperText={touched.laptopNo && errors.laptopNo}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>ยกเลิก</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={hasError}>
                        บันทึก
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Dialog แจ้งผลลัพธ์ */}
            <Dialog open={!!successInfo} onClose={handleCloseSuccess}>
                <DialogTitle>สร้างผู้ใช้เสร็จสมบูรณ์</DialogTitle>
                <DialogContent dividers>
                    <Typography gutterBottom>
                        <b>Username:</b> {successInfo?.username}
                        <IconButton size="small" onClick={() => handleCopy(successInfo?.username)}>
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </Typography>
                    <Typography gutterBottom>
                        <b>Password:</b> {successInfo?.password}
                        <IconButton size="small" onClick={() => handleCopy(successInfo?.password)}>
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSuccess} variant="contained">ปิด</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
