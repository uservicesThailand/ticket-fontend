// =============================
// file: src/components/AdminStatusDialog.jsx
// =============================
import React, { useEffect, useMemo, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField,
    FormControl, InputLabel, Select, MenuItem, Divider, Typography, CircularProgress
} from "@mui/material";
import dayjs from "dayjs";

const STATUS = {
    NEW: { key: "NEW", label: "รอตรวจสอบ" },
    IN_PROGRESS: { key: "IN_PROGRESS", label: "กำลังดำเนินการ" },
    WAITING: { key: "WAITING", label: "รออะไหล่/ผู้รับผิดชอบ" },
    DONE: { key: "DONE", label: "ดำเนินการเสร็จแล้ว" },
    CANCELLED: { key: "CANCELLED", label: "ยกเลิก" },
};

export default function AdminStatusDialog({
    open,
    issueId,        // << เปลี่ยนจาก row → รับ id
    apiHttp,        // << axios instance จากหน้า Ticket.jsx
    onClose,
    onSubmit,
    disabled,
    quickDone = false,
}) {
    const [loading, setLoading] = useState(false);
    const [loadErr, setLoadErr] = useState("");
    const [data, setData] = useState(null);

    const [status, setStatus] = useState(STATUS.IN_PROGRESS.key);
    const [assignee, setAssignee] = useState("");
    const [note, setNote] = useState("");

    // รายชื่อผู้รับผิดชอบ (ปรับเป็นดึงจาก API ในอนาคตได้)
    const ASSIGNEES = useMemo(
        () => ["เชาวลิต", "พิมพ์ลภัส", "พิเชฐ", "อนุวัตน์", "ณัฐกรณ์"],
        []
    );

    // โหลดข้อมูล ticket จาก API ทุกครั้งที่เปิดและมี issueId
    useEffect(() => {
        let cancelled = false;

        async function load() {
            if (!open || !issueId) return;
            setLoading(true);
            setLoadErr("");
            try {
                const res = await apiHttp.get(`/api/issues/${issueId}`);
                if (cancelled) return;

                const t = res.data || {};
                setData(t);

                // ค่าเริ่มต้น: ถ้า quickDone → DONE, ไม่งั้นใช้ของเดิม/IN_PROGRESS
                const nextStatus = quickDone ? STATUS.DONE.key : (t.status || STATUS.IN_PROGRESS.key);
                setStatus(nextStatus);

                const defaultAssignee =
                    t.assignee ||
                    sessionStorage.getItem("usvt_name") ||
                    ""; // ไม่มีให้เป็นค่าว่าง → บังคับเลือก
                setAssignee(defaultAssignee);

                setNote(t.note || ""); // เริ่มต้นว่าง ถ้าอยาก prefill หมายเหตุล่าสุด ค่อยต่อยอดจาก API
            } catch (e) {
                if (cancelled) return;
                setLoadErr(e?.response?.data?.message || e.message || "โหลดข้อมูลไม่สำเร็จ");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [open, issueId, apiHttp, quickDone]);

    const canSave = useMemo(() => {
        if (disabled) return false;
        if (!status) return false;
        if (!assignee || assignee === "-") return false;
        return true;
    }, [disabled, status, assignee]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>อัพเดทสถานะ {/* {issueId ? `(ID: ${issueId})` : ""} */}</DialogTitle>

            <DialogContent dividers>
                {loading && (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={20} />
                        <Typography>กำลังโหลดข้อมูล...</Typography>
                    </Stack>
                )}

                {!loading && loadErr && (
                    <Typography color="error">{loadErr}</Typography>
                )}

                {!loading && !loadErr && data && (
                    <Stack spacing={2}>
                        {/* แสดงข้อมูลหลักแบบ read-only */}
                        <TextField
                            variant="filled"
                            label="Ticket ID:"
                            value={data.code || "-"}
                            fullWidth
                            slotProps={{ input: { readOnly: true } }}
                        />
                        <TextField
                            variant="filled"
                            label="อาการ:"
                            value={data.detail || "-"}
                            fullWidth
                            multiline
                            slotProps={{ input: { readOnly: true } }}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                variant="filled"
                                label="ผู้แจ้ง:"
                                value={data.requester || "-"}
                                fullWidth
                                slotProps={{ input: { readOnly: true } }}
                            />
                            <TextField
                                variant="filled"
                                label="วันที่แจ้ง:"
                                value={
                                    data.created_at
                                        ? dayjs(data.created_at).format("DD/MM/YYYY HH:mm")
                                        : "-"
                                }
                                fullWidth
                                slotProps={{ input: { readOnly: true } }}
                            />
                        </Stack>

                        {/* ฟอร์มอัพเดทสถานะ */}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <FormControl fullWidth>
                                <InputLabel>สถานะ:</InputLabel>
                                <Select
                                    label="สถานะ"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    disabled={disabled}
                                >
                                    {Object.values(STATUS).map((s) => (
                                        <MenuItem key={s.key} value={s.key}>
                                            {s.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>ผู้รับผิดชอบ:</InputLabel>
                                <Select
                                    label="ผู้รับผิดชอบ"
                                    value={assignee || "-"}
                                    onChange={(e) => setAssignee(e.target.value)}
                                >
                                    <MenuItem value="-" disabled>โปรดระบุ</MenuItem>
                                    {ASSIGNEES.map((name) => (
                                        <MenuItem key={name} value={name}>{name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>

                        <TextField
                            label="การแก้ไข/Note:"
                            multiline
                            minRows={4}
                            fullWidth
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            inputProps={{ maxLength: 2000 }}
                        />

                        <Divider />
                        <Typography variant="body2" color="text.secondary">
                            เฉพาะผู้มีสิทธิ์เท่านั้นที่แก้สถานะได้
                        </Typography>
                    </Stack>
                )}

                {!loading && !loadErr && !data && (
                    <Typography>ยังไม่มีข้อมูลสำหรับ ID ที่ระบุ</Typography>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>ปิด</Button>
                <Button
                    variant="contained"
                    disabled={!canSave}
                    onClick={() => onSubmit?.({ status, assignee, note })}
                >
                    บันทึก
                </Button>
            </DialogActions>
        </Dialog>
    );
}
