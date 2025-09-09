// =============================
// file: src/components/IssueDetailDialog.jsx
// =============================
import * as React from "react";
import {
    Box, Dialog, DialogTitle, DialogContent,
    Button, Stack, Chip, Typography, Divider, ImageList, ImageListItem,
    LinearProgress, Avatar, Tooltip, IconButton, Card, CardContent, Link, List, ListItem, ListItemIcon, ListItemText, useMediaQuery
} from "@mui/material";
import { X, ExternalLink, Phone, Mail, Clock, CheckCheck, Hourglass, Ban, Play } from "lucide-react";
import {
    Timeline, TimelineItem, TimelineSeparator, TimelineDot,
    TimelineConnector, TimelineContent, TimelineOppositeContent
} from "@mui/lab";
import dayjs from "dayjs";
import "dayjs/locale/th";
dayjs.locale("th");

export default function IssueDetailDialog({
    open,
    issueId,
    onClose,
    apiHttp,              // axios instance
    parseThaiDateToDayjs, // helper parse วันที่
}) {
    const [loading, setLoading] = React.useState(false);
    const [data, setData] = React.useState(null);
    const [error, setError] = React.useState("");

    // ดึงรายละเอียดแบบ lazy เมื่อเปิด
    React.useEffect(() => {
        let ignore = false;
        async function fetchDetail() {
            if (!open || !issueId) return;
            setLoading(true);
            setError("");
            try {
                // ควรคืน: { id, code, title, detail, requester, requester_tel, tel, u_email, category, status, assignee, createdAt, updatedAt, images:[{url,name}], logs:[{changed_at,from_status,to_status,changed_by,note}] }
                const res = await apiHttp.get(`/api/issues/${issueId}`);
                if (!ignore) setData(res.data);
            } catch (err) {
                if (!ignore) setError(err?.response?.data?.message || err.message || "โหลดข้อมูลไม่สำเร็จ");
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        fetchDetail();
        return () => { ignore = true; };
    }, [open, issueId, apiHttp]);

    const statusColor = {
        NEW: "warning",
        IN_PROGRESS: "info",
        WAITING: "secondary",
        DONE: "success",
        CANCELLED: "default",
    };

    const statusIcon = (st) => {
        switch (st) {
            case "NEW": return <Play size={14} />;
            case "IN_PROGRESS": return <Hourglass size={14} />;
            case "WAITING": return <Clock size={14} />;
            case "DONE": return <CheckCheck size={14} />;
            case "CANCELLED": return <Ban size={14} />;
            default: return <Clock size={14} />;
        }
    };

    // สีของจุดบนไทม์ไลน์
    const statusDotColor = (st) => {
        // "grey" | "primary" | "success" | "warning" | "info" | "error" | "inherit"
        switch (st) {
            case "NEW": return "warning";
            case "IN_PROGRESS": return "info";
            case "WAITING": return "inherit";
            case "DONE": return "success";
            case "CANCELLED": return "error";
            default: return "inherit";
        }
    };

    const renderWhen = (s) => {
        if (!s) return "-";
        const d = parseThaiDateToDayjs ? parseThaiDateToDayjs(s) : dayjs(s);
        return d.isValid() ? d.format("DD MMM YYYY HH:mm") : s;
    };

    const asDayjs = (s) => (parseThaiDateToDayjs ? parseThaiDateToDayjs(s) : dayjs(s));

    const Section = ({ title, children, right }) => (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
                {right || null}
            </Stack>
            {children}
        </Box>
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    รายละเอียดการแจ้งงาน
                </Typography>
                <Box flexGrow={1} />
                {data?.publicUrl && (
                    <Tooltip title="เปิดในหน้าใหม่">
                        <Button
                            size="small"
                            variant="text"
                            endIcon={<ExternalLink size={16} />}
                            href={data.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            เปิดหน้าเว็บ
                        </Button>
                    </Tooltip>
                )}
                <Tooltip title="ปิด">
                    <IconButton onClick={onClose} size="small">
                        <X size={18} />
                    </IconButton>
                </Tooltip>
            </DialogTitle>

            {loading && <LinearProgress />}

            <DialogContent dividers>
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
                )}

                {data ? (
                    <Stack spacing={2.5}>
                        {/* ===== Header ===== */}
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                                Ticket: {data.code || "-"}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Chip label={`หมวด: ${data.category || "-"}`} color="primary" variant="outlined" />
                                <Chip
                                    label={`สถานะ: ${data.status || "-"}`}
                                    color={statusColor[data.status] || "default"}
                                    variant={data.status === "NEW" ? "outlined" : "filled"}
                                />
                                {data.assignee && <Chip label={`ผู้รับผิดชอบ: ${data.assignee}`} color="secondary" />}
                            </Stack>
                        </Box>

                        <Divider />

                        {/* ===== ผู้แจ้ง & ช่องทางติดต่อ + รายละเอียด ===== */}
                        <Stack direction={"column"} spacing={2.5}>
                            {/* ผู้แจ้ง + ช่องทางติดต่อ */}
                            <Card>
                                <CardContent>
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                                        <Avatar sx={{ width: 32, height: 32 }}>
                                            {(data.requester || "U").slice(0, 1)}
                                        </Avatar>
                                        <Typography variant="body1" fontWeight={700}>
                                            {data.requester || "-"}
                                        </Typography>
                                    </Stack>

                                    <List dense disablePadding>
                                        <ListItem disableGutters sx={{ py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 28 }}><Phone size={16} /></ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    data.tel || data.requester_tel ? (
                                                        <Link
                                                            href={`tel:${data.tel || data.requester_tel}`}
                                                            underline="hover"
                                                        >
                                                            {data.tel || data.requester_tel}
                                                        </Link>
                                                    ) : "-"
                                                }
                                                secondary="เบอร์โทร"
                                            />
                                        </ListItem>

                                        <ListItem disableGutters sx={{ py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 28 }}><Mail size={16} /></ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    data.u_email ? (
                                                        <Link href={`mailto:${data.u_email}`} underline="hover">
                                                            {data.u_email}
                                                        </Link>
                                                    ) : "-"
                                                }
                                                secondary="อีเมล"
                                            />
                                        </ListItem>
                                    </List>
                                </CardContent>
                            </Card>

                            {/* รายละเอียดอาการ */}
                            <Box sx={{ flex: 1 }}>
                                <Section title="รายละเอียดอาการ">
                                    <Typography whiteSpace="pre-wrap">
                                        {data.detail || "-"}
                                    </Typography>
                                </Section>

                                <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 2 }}>
                                    <Chip variant="outlined" label={`สร้างเมื่อ: ${renderWhen(data.createdAt)}`} />
                                    <Chip variant="outlined" label={`อัพเดท: ${renderWhen(data.updatedAt)}`} />
                                </Stack>
                            </Box>
                        </Stack>

                        <Divider />

                        {/* ===== รูปภาพแนบ ===== */}
                        <Section title="รูปภาพแนบ">
                            {Array.isArray(data.images) && data.images.length > 0 ? (
                                <ResponsiveMasonry images={data.images} />
                            ) : (
                                <Typography color="text.secondary">ไม่มีรูปภาพแนบ</Typography>
                            )}
                        </Section>

                        {/* ===== ประวัติสถานะ (Timeline) ===== */}
                        {Array.isArray(data.logs) && data.logs.length > 0 && (
                            <>
                                <Divider />
                                <Section
                                    title="ประวัติสถานะ"
                                    right={<Chip size="small" variant="outlined" label={`${data.logs.length} รายการ`} />}
                                >
                                    {/*
                    เรียงเวลา เก่า -> ใหม่ เพื่อไล่จากบนลงล่าง
                    ถ้าต้องการสลับใหม่->เก่า ให้ reverse() แทน
                  */}
                                    <Timeline sx={{ mt: 1 }}>
                                        {[...data.logs]
                                            .sort((a, b) => {
                                                const da = asDayjs(a.changed_at);
                                                const db = asDayjs(b.changed_at);
                                                if (!da.isValid() || !db.isValid()) return 0;
                                                return da.valueOf() - db.valueOf();
                                            })
                                            .map((log, i, arr) => {
                                                const when = renderWhen(log.changed_at);
                                                const dotColor = statusDotColor(log.to_status);
                                                const isLast = i === arr.length - 1;
                                                return (
                                                    <TimelineItem key={i}>
                                                        <TimelineOppositeContent sx={{ flex: 0.25 }}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {when}
                                                            </Typography>
                                                        </TimelineOppositeContent>

                                                        <TimelineSeparator>
                                                            <TimelineDot color={dotColor} variant={log.to_status === "DONE" ? "filled" : "outlined"} sx={{ boxShadow: "none" }}>
                                                                {statusIcon(log.to_status)}
                                                            </TimelineDot>
                                                            {!isLast && <TimelineConnector />}
                                                        </TimelineSeparator>

                                                        <TimelineContent sx={{ py: 0.5 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                {log.from_status || "-"} → {log.to_status}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {log.changed_by ? `โดย ${log.changed_by}` : "โดย ระบบ"}
                                                                {log.note ? ` — ${log.note}` : ""}
                                                            </Typography>
                                                        </TimelineContent>
                                                    </TimelineItem>
                                                );
                                            })}
                                    </Timeline>
                                </Section>
                            </>
                        )}
                    </Stack>
                ) : (
                    !loading && !error && <Typography color="text.secondary">ไม่พบข้อมูล</Typography>
                )}
            </DialogContent>
        </Dialog>
    );
}

/** ====== Subcomponents ====== **/
function ResponsiveMasonry({ images }) {
    // จัดคอลัมน์ให้เหมาะกับขนาดหน้าจอ
    const isSm = useMediaQuery("(max-width:600px)");
    const isMd = useMediaQuery("(max-width:900px)");
    const cols = isSm ? 1 : isMd ? 2 : 3;

    return (
        <ImageList variant="masonry" cols={cols} gap={8}>
            {images.map((img, idx) => (
                <ImageListItem key={idx}>
                    <img
                        src={img.url}
                        alt={img.name || `image-${idx}`}
                        loading="lazy"
                        style={{ borderRadius: 8, width: "100%", display: "block" }}
                    />
                    {img.name && (
                        <Typography variant="caption" color="text.secondary">
                            {img.name}
                        </Typography>
                    )}
                </ImageListItem>
            ))}
        </ImageList>
    );
}
