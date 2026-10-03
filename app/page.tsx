"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";

// Types
interface RowData {
  id: string;
  ngay: string;
  loaiAnPham: string;
  soLuong: number | "";
  donGia: number | "";
  ghiChu: string;
  team: string;
  thanhToan: string;
}

interface TeamData {
  value: string;
  label: string;
  color: string;
  gradient: string;
}

const DEFAULT_PRODUCT_TYPES = ["Ảnh CP", "Ảnh TK", "VIDEO", "VIDEO + TK", "Ảnh Bill"];

const DON_GIA_PRESETS = [
  { value: 60000, label: "60.000" },
  { value: 100000, label: "100.000" },
  { value: 300000, label: "300.000" },
  { value: 500000, label: "500.000" },
];

const THANH_TOAN_OPTIONS = [
  { value: "", label: "-- Chọn --" },
  { value: "Đã thanh toán", label: "Đã thanh toán" },
  { value: "Chưa thanh toán", label: "Chưa thanh toán" },
  { value: "Thanh toán một phần", label: "Thanh toán một phần" },
];

const DEFAULT_TEAMS: TeamData[] = [
  { value: "Team Ảnh Cổ Phiếu", label: "Ảnh Cổ Phiếu", color: "#34d399", gradient: "linear-gradient(135deg, #059669, #34d399)" },
  { value: "Team P", label: "Team P", color: "#a78bfa", gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)" },
  { value: "Team Sửa Ảnh", label: "Sửa Ảnh", color: "#fb923c", gradient: "linear-gradient(135deg, #ea580c, #fb923c)" },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function createEmptyRow(team: string = ""): RowData {
  return { id: generateId(), ngay: "", loaiAnPham: "", soLuong: "", donGia: "", ghiChu: "", team, thanhToan: "Chưa thanh toán" };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return dateStr; }
}

// SVG Icon Components
function IconPlus() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function IconDownload() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconUpload() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 10V2m0 0L5 5m3-3l3 3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconSearch() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function IconEdit() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5l2 2L4.5 11.5H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>; }
function IconTrash() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8l-.7 7.3c-.05.4-.4.7-.8.7H4.5c-.4 0-.75-.3-.8-.7L3 4zM5.5 6.5v3M8.5 6.5v3M2 4h10M5.5 4V2.5h3V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconUndo() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 7v-3h3M3 4l3.5 3.5C8 9 10.5 9 12 7.5 13.5 6 13.5 3.5 12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconClose() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function IconSettings() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function IconSave() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12.5 14H3.5a1 1 0 01-1-1V3a1 1 0 011-1h7l3 3v8a1 1 0 01-1 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M5 14v-4h6v4M5 2v3h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconReceipt() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12l3-2 3 2 3-2 3 2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6M9 14h6M9 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconChart() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="10" width="3" height="7" rx="1" fill="currentColor" opacity="0.5" /><rect x="7" y="6" width="3" height="11" rx="1" fill="currentColor" opacity="0.7" /><rect x="12" y="3" width="3" height="14" rx="1" fill="currentColor" /></svg>; }
function IconWallet() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M2 9h16" stroke="currentColor" strokeWidth="1.5" /><circle cx="14" cy="12.5" r="1.5" fill="currentColor" /><path d="M5 5V4a2 2 0 012-2h6a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5" /></svg>; }
function IconCheck() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" /><path d="M6.5 10l2.5 2.5L13.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconClock() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" /><path d="M10 5.5V10l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function IconCloud() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4.5 12.5h7a3 3 0 000-6 3.5 3.5 0 00-7 .5 2.5 2.5 0 000 5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>; }
function IconMenu() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }

function getBadgeClass(loai: string): string {
  if (!loai) return "badge";
  const hash = loai.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const classes = ["badge-red", "badge-orange", "badge-blue", "badge-purple", "badge-teal"];
  return "badge " + classes[hash % classes.length];
}

// Firebase collections
const ROWS_COLLECTION = "rows";
const DELETED_COLLECTION = "deleted_rows";
const SETTINGS_DOC = "app_settings";
const SETTINGS_COLLECTION = "settings";

interface ToastItem {
  id: string;
  message: string;
  type: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Home() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [deletedRows, setDeletedRows] = useState<RowData[]>([]);
  const [teams, setTeams] = useState<TeamData[]>(DEFAULT_TEAMS);
  const [productTypes, setProductTypes] = useState<string[]>(DEFAULT_PRODUCT_TYPES);
  const [editProductTypes, setEditProductTypes] = useState<string[]>([]);
  const [activeTeam, setActiveTeam] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<RowData>(createEmptyRow());
  const [isEditModal, setIsEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLoai, setFilterLoai] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editTeams, setEditTeams] = useState<TeamData[]>([]);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("syncing");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  // ===== FIREBASE REAL-TIME SYNC =====
  // Listen to rows collection
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, ROWS_COLLECTION),
      (snapshot) => {
        const data: RowData[] = [];
        snapshot.forEach((docSnap) => {
          data.push(docSnap.data() as RowData);
        });
        // Sort by date descending, then by id
        data.sort((a, b) => {
          if (a.ngay && b.ngay) return a.ngay.localeCompare(b.ngay);
          return 0;
        });
        setRows(data);
        setIsLoaded(true);
        setSyncStatus("synced");
      },
      (error) => {
        console.error("Firebase sync error:", error);
        setSyncStatus("error");
        // Fallback to localStorage
        const saved = localStorage.getItem("tinhtien_data");
        if (saved) { try { setRows(JSON.parse(saved)); } catch { setRows([]); } }
        setIsLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  // Listen to deleted_rows collection (Trash)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, DELETED_COLLECTION),
      (snapshot) => {
        const data: RowData[] = [];
        snapshot.forEach((docSnap) => {
          data.push(docSnap.data() as RowData);
        });
        setDeletedRows(data);
      },
      (error) => {
        console.error("Deleted rows sync error:", error);
      }
    );
    return () => unsub();
  }, []);

  // Listen to settings (teams)
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, SETTINGS_COLLECTION, SETTINGS_DOC),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.teams && Array.isArray(data.teams)) { setTeams(data.teams); }
          if (data.productTypes && Array.isArray(data.productTypes)) { setProductTypes(data.productTypes); }
        }
      },
      (error) => {
        console.error("Settings sync error:", error);
        const saved = localStorage.getItem("tinhtien_teams");
        if (saved) { try { setTeams(JSON.parse(saved)); } catch { /* keep defaults */ } }
      }
    );
    return () => unsub();
  }, []);

  // Also save to localStorage as backup
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("tinhtien_data", JSON.stringify(rows));
      localStorage.setItem("tinhtien_teams", JSON.stringify(teams));
      localStorage.setItem("tinhtien_productTypes", JSON.stringify(productTypes));
    }
  }, [rows, teams, isLoaded]);

  const showToast = useCallback((message: string, type: string = "success", actionConfig?: { label: string; action: () => void }) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type, actionLabel: actionConfig?.label, onAction: actionConfig?.action }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  const addNewProductType = () => {
    setEditProductTypes(prev => [...prev, "Loại ấn phẩm mới"]);
  };

  const addNewTeam = async () => {
    const newTeam: TeamData = {
      value: `Team-${generateId()}`,
      label: `Team mới`,
      color: "#94a3b8",
      gradient: "linear-gradient(135deg, #64748b, #94a3b8)"
    };
    const updatedTeams = [...teams, newTeam];
    setTeams(updatedTeams);
    await saveSettingsToFirebase(updatedTeams, productTypes);
    showToast("Đã thêm Team mới. Hãy đổi tên và màu sắc!");
    
    // Auto open settings to let user rename it
    setEditTeams(updatedTeams.map(t => ({ ...t })));
    setShowSettings(true);
  };

  const removeTeam = (index: number) => {
    const teamToRemove = editTeams[index];
    const hasData = rows.some(r => r.team === teamToRemove.value);
    if (hasData) {
      showToast("Không thể xóa Team đang có dữ liệu!", "error");
      return;
    }
    setEditTeams(prev => prev.filter((_, i) => i !== index));
  };

  const calcSoTien = (soLuong: number | "", donGia: number | ""): number => {
    const sl = typeof soLuong === "number" ? soLuong : 0;
    const dg = typeof donGia === "number" ? donGia : 0;
    return sl * dg;
  };

  const filteredRows = useMemo(() => {
    const sourceList = activeTeam === "trash" ? deletedRows : rows;
    return sourceList.filter((row) => {
      const matchTeam = activeTeam === "all" || activeTeam === "trash" || row.team === activeTeam;
      const matchSearch = !searchTerm || row.ngay.toLowerCase().includes(searchTerm.toLowerCase()) || row.ghiChu.toLowerCase().includes(searchTerm.toLowerCase()) || row.loaiAnPham.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoai = !filterLoai || row.loaiAnPham === filterLoai;
      return matchTeam && matchSearch && matchLoai;
    });
  }, [rows, deletedRows, activeTeam, searchTerm, filterLoai]);

  const teamStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number; paid: number; unpaid: number }> = {};
    stats["all"] = { count: rows.length, total: 0, paid: 0, unpaid: 0 };
    stats["trash"] = { count: deletedRows.length, total: 0, paid: 0, unpaid: 0 };
    teams.forEach((t) => { stats[t.value] = { count: 0, total: 0, paid: 0, unpaid: 0 }; });
    rows.forEach((r) => {
      const money = calcSoTien(r.soLuong, r.donGia);
      stats["all"].total += money;
      if (r.thanhToan === "Đã thanh toán") stats["all"].paid++;
      if (r.thanhToan === "Chưa thanh toán") stats["all"].unpaid++;
      if (stats[r.team]) {
        stats[r.team].count++;
        stats[r.team].total += money;
        if (r.thanhToan === "Đã thanh toán") stats[r.team].paid++;
        if (r.thanhToan === "Chưa thanh toán") stats[r.team].unpaid++;
      }
    });
    deletedRows.forEach((r) => {
      const money = calcSoTien(r.soLuong, r.donGia);
      stats["trash"].total += money;
      if (r.thanhToan === "Đã thanh toán") stats["trash"].paid++;
      if (r.thanhToan === "Chưa thanh toán") stats["trash"].unpaid++;
    });
    return stats;
  }, [rows, deletedRows, teams]);

  const currentStats = teamStats[activeTeam] || { count: 0, total: 0, paid: 0, unpaid: 0 };

  // ===== FIREBASE CRUD & RECYCLE BIN =====
  const saveRowToFirebase = async (row: RowData) => {
    try {
      setSyncStatus("syncing");
      await setDoc(doc(db, ROWS_COLLECTION, row.id), row);
      setSyncStatus("synced");
    } catch (error) {
      console.error("Save error:", error);
      setSyncStatus("error");
      showToast("Lỗi lưu dữ liệu!", "error");
    }
  };

  const moveRowToTrash = async (id: string) => {
    const rowToDelete = rows.find(r => r.id === id);
    if (!rowToDelete) return;
    try {
      setSyncStatus("syncing");
      const batch = writeBatch(db);
      batch.set(doc(db, DELETED_COLLECTION, id), { ...rowToDelete, deletedAt: new Date().toISOString() });
      batch.delete(doc(db, ROWS_COLLECTION, id));
      await batch.commit();
      setSyncStatus("synced");
      showToast("Đã chuyển mục vào Thùng rác", "success", {
        label: "Hoàn tác",
        action: () => restoreRowFromTrash(id)
      });
    } catch (error) {
      console.error("Move to trash error:", error);
      setSyncStatus("error");
      showToast("Lỗi xóa dữ liệu!", "error");
    }
  };

  const restoreRowFromTrash = async (id: string) => {
    const rowToRestore = deletedRows.find(r => r.id === id) || rows.find(r => r.id === id);
    if (!rowToRestore) return;
    try {
      setSyncStatus("syncing");
      const batch = writeBatch(db);
      const cleanRow = { ...rowToRestore };
      delete (cleanRow as Record<string, unknown>).deletedAt;
      batch.set(doc(db, ROWS_COLLECTION, id), cleanRow);
      batch.delete(doc(db, DELETED_COLLECTION, id));
      await batch.commit();
      setSyncStatus("synced");
      showToast("Đã khôi phục dữ liệu thành công!");
    } catch (error) {
      console.error("Restore error:", error);
      setSyncStatus("error");
      showToast("Lỗi khôi phục dữ liệu!", "error");
    }
  };

  const permanentDeleteRow = async (id: string) => {
    try {
      setSyncStatus("syncing");
      await deleteDoc(doc(db, DELETED_COLLECTION, id));
      setSyncStatus("synced");
      showToast("Đã xóa vĩnh viễn mục dữ liệu");
    } catch (error) {
      console.error("Permanent delete error:", error);
      setSyncStatus("error");
      showToast("Lỗi xóa vĩnh viễn!", "error");
    }
  };

  const emptyTrash = async () => {
    if (deletedRows.length === 0) return;
    try {
      setSyncStatus("syncing");
      const batch = writeBatch(db);
      deletedRows.forEach(r => batch.delete(doc(db, DELETED_COLLECTION, r.id)));
      await batch.commit();
      setSyncStatus("synced");
      showToast(`Đã dọn sạch ${deletedRows.length} mục trong Thùng rác`);
    } catch (error) {
      console.error("Empty trash error:", error);
      setSyncStatus("error");
      showToast("Lỗi dọn thùng rác!", "error");
    }
  };

  const saveSettingsToFirebase = async (teamsData: TeamData[], productTypesData: string[]) => {
    try {
      await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), { teams: teamsData, productTypes: productTypesData });
    } catch (error) {
      console.error("Save error:", error);
      showToast("Lỗi lưu cài đặt!", "error");
    }
  };

  const openAddModal = () => {
    const team = activeTeam !== "all" && activeTeam !== "trash" ? activeTeam : "";
    setModalData(createEmptyRow(team));
    setIsEditModal(false);
    setShowModal(true);
  };

  const openEditModal = (row: RowData) => {
    setModalData({ ...row });
    setIsEditModal(true);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleModalChange = (field: keyof RowData, value: string | number) => {
    setModalData((prev) => ({ ...prev, [field]: value }));
  };

  const handleModalSubmit = async () => {
    if (!modalData.team) { showToast("Vui lòng chọn Team!", "error"); return; }
    if (!modalData.loaiAnPham) { showToast("Vui lòng chọn loại ấn phẩm!", "error"); return; }

    await saveRowToFirebase(modalData);

    if (isEditModal) {
      showToast("Cập nhật thành công");
    } else {
      showToast("Đã thêm mục mới");
    }
    closeModal();
  };

  const handleDelete = (id: string) => setConfirmDelete(id);

  const confirmDeleteRow = async () => {
    if (confirmDelete) {
      if (activeTeam === "trash") {
        await permanentDeleteRow(confirmDelete);
      } else {
        await moveRowToTrash(confirmDelete);
      }
      setConfirmDelete(null);
    }
  };

  const deleteAllRows = async () => {
    if (activeTeam === "trash") {
      await emptyTrash();
      setConfirmDeleteAll(false);
      return;
    }

    const toDelete = activeTeam === "all" ? rows : rows.filter(r => r.team === activeTeam);
    if (toDelete.length === 0) return;

    try {
      setSyncStatus("syncing");
      const batch = writeBatch(db);
      toDelete.forEach(r => {
        batch.set(doc(db, DELETED_COLLECTION, r.id), { ...r, deletedAt: new Date().toISOString() });
        batch.delete(doc(db, ROWS_COLLECTION, r.id));
      });
      await batch.commit();
      setSyncStatus("synced");
      showToast(`Đã chuyển ${toDelete.length} mục vào Thùng rác`, "success", {
        label: "Xem thùng rác",
        action: () => setActiveTeam("trash")
      });
    } catch (error) {
      console.error("Delete all error:", error);
      setSyncStatus("error");
      showToast("Lỗi xóa dữ liệu!", "error");
    }
    setConfirmDeleteAll(false);
  };

  const exportCSV = () => {
    const dataToExport = activeTeam === "all" ? rows : rows.filter((r) => r.team === activeTeam);
    const headers = ["STT", "Ngày", "Loại ấn phẩm", "Số lượng", "Đơn giá", "Số tiền", "Ghi chú", "Team", "Thanh toán"];
    const csvRows = [headers.join(","), ...dataToExport.map((r, i) => [i + 1, `"${r.ngay ? formatDate(r.ngay) : ""}"`, `"${r.loaiAnPham}"`, r.soLuong, r.donGia, calcSoTien(r.soLuong, r.donGia), `"${r.ghiChu}"`, `"${r.team}"`, `"${r.thanhToan}"`].join(","))];
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tinh-tien-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Đã xuất file CSV");
  };

  const togglePayment = async (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    const newStatus = row.thanhToan === "Đã thanh toán" ? "Chưa thanh toán" : "Đã thanh toán";
    await saveRowToFirebase({ ...row, thanhToan: newStatus });
  };

  // ===== TEAM MANAGEMENT =====
  const openSettings = () => {
    setEditTeams(teams.map(t => ({ ...t })));
    setEditProductTypes([...productTypes]);
    setShowSettings(true);
  };

  const updateTeamField = (index: number, field: keyof TeamData, value: string) => {
    setEditTeams(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "label") { updated[index].value = value; }
      return updated;
    });
  };

  const saveSettingsChanges = async () => {
    const mapping: Record<string, string> = {};
    teams.forEach((oldTeam, i) => {
      if (editTeams[i] && oldTeam.value !== editTeams[i].value) {
        mapping[oldTeam.value] = editTeams[i].value;
      }
    });

    // Update rows with new team names in Firebase
    if (Object.keys(mapping).length > 0) {
      const batch = writeBatch(db);
      rows.forEach(r => {
        if (mapping[r.team]) {
          const updatedRow = { ...r, team: mapping[r.team] };
          batch.set(doc(db, ROWS_COLLECTION, r.id), updatedRow);
        }
      });
      await batch.commit();
    }

    if (mapping[activeTeam]) { setActiveTeam(mapping[activeTeam]); }

    await saveSettingsToFirebase(editTeams, editProductTypes);
    setTeams(editTeams);
    setProductTypes(editProductTypes);
    setShowSettings(false);
    showToast("Đã lưu cài đặt thành công");
  };

  // ===== BACKUP & RESTORE =====
  const exportBackup = () => {
    const backupData = { version: "1.0", exportDate: new Date().toISOString(), teams, rows };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fintrack-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Đã xuất file sao lưu");
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.rows && Array.isArray(data.rows)) {
          // Save all rows to Firebase
          const batch = writeBatch(db);
          data.rows.forEach((row: RowData) => {
            batch.set(doc(db, ROWS_COLLECTION, row.id), row);
          });
          await batch.commit();

          if (data.teams && Array.isArray(data.teams)) {
            await saveSettingsToFirebase(data.teams, data.productTypes || productTypes);
          }
          showToast(`Đã khôi phục ${data.rows.length} mục dữ liệu`);
        } else {
          showToast("File không hợp lệ!", "error");
        }
      } catch {
        showToast("Lỗi đọc file sao lưu!", "error");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isLoaded) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>Đang kết nối đến Cloud...</p>
    </div>
  );

  return (
    <div className="app-layout">
      {/* Mobile Menu Toggle */}
      <button className="mobile-menu-btn" onClick={() => setMobileMenu(!mobileMenu)}>
        {mobileMenu ? <IconClose /> : <IconMenu />}
      </button>

      {/* Mobile Overlay */}
      {mobileMenu && <div className="mobile-overlay" onClick={() => setMobileMenu(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-icon"><IconReceipt /></div>
          <div className="logo-text">
            <span className="logo-name">FinTrack</span>
            <span className="logo-sub">Quản lý tài chính</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-header">
            <span className="nav-label">TEAM</span>
            <button className="nav-settings-btn" onClick={openSettings} title="Quản lý Team"><IconSettings /></button>
          </div>
          <button className={`nav-item ${activeTeam === "all" ? "active" : ""}`} onClick={() => { setActiveTeam("all"); setMobileMenu(false); }}>
            <div className="nav-icon"><IconChart /></div>
            <span>Tổng quan</span>
            <span className="nav-badge">{teamStats["all"]?.count || 0}</span>
          </button>
          {teams.map((team) => (
            <div key={team.value} className="nav-item-wrapper">
              <button className={`nav-item ${activeTeam === team.value ? "active" : ""}`} onClick={() => { setActiveTeam(team.value); setMobileMenu(false); }}>
                <div className="nav-dot" style={{ background: team.color }} />
                <span>{team.label}</span>
                <span className="nav-badge">{teamStats[team.value]?.count || 0}</span>
              </button>
              <button className="nav-item-edit" onClick={openSettings} title="Chỉnh sửa Team"><IconEdit /></button>
            </div>
          ))}

          <div className="nav-section-header" style={{ marginTop: '16px' }}>
            <span className="nav-label">HỆ THỐNG</span>
          </div>
          <button className={`nav-item ${activeTeam === "trash" ? "active" : ""}`} onClick={() => { setActiveTeam("trash"); setMobileMenu(false); }}>
            <div className="nav-icon"><IconTrash /></div>
            <span>Thùng rác</span>
            <span className="nav-badge" style={deletedRows.length > 0 ? { background: "rgba(255,107,107,0.2)", color: "#ff6b6b" } : undefined}>
              {deletedRows.length}
            </span>
          </button>
        </nav>

        <div className="sidebar-footer">
          {/* Sync Status */}
          <div className={`sync-status ${syncStatus}`}>
            <IconCloud />
            <span>
              {syncStatus === "synced" && "Đã đồng bộ Cloud"}
              {syncStatus === "syncing" && "Đang đồng bộ..."}
              {syncStatus === "error" && "Mất kết nối - dùng offline"}
            </span>
          </div>
          <div className="sidebar-backup">
            <button className="sidebar-btn" onClick={exportBackup} title="Sao lưu dữ liệu"><IconSave /> Sao lưu</button>
            <button className="sidebar-btn" onClick={() => fileInputRef.current?.click()} title="Khôi phục từ file JSON"><IconUpload /> Khôi phục</button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={importBackup} style={{ display: "none" }} />
          </div>
          <div className="sidebar-version">v1.2.0 · Trash Recovery</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div>
            <h1 className="page-title">
              {activeTeam === "all" ? "Tổng quan" : activeTeam === "trash" ? "Thùng rác (Đã xóa)" : (teams.find(t => t.value === activeTeam)?.label || activeTeam)}
            </h1>
            <p className="page-subtitle">
              {activeTeam === "all"
                ? "Quản lý tất cả đội nhóm"
                : activeTeam === "trash"
                ? "Các mục đã xóa tạm thời. Bạn có thể khôi phục lại bất kỳ lúc nào."
                : `Quản lý dữ liệu ${teams.find(t => t.value === activeTeam)?.label || activeTeam}`}
            </p>
          </div>
          <div className="top-bar-actions">
            {activeTeam === "trash" ? (
              deletedRows.length > 0 && (
                <button className="btn btn-ghost btn-ghost-danger" onClick={() => setConfirmDeleteAll(true)}>
                  <IconTrash /> Dọn sạch Thùng rác
                </button>
              )
            ) : (
              <>
                {rows.length > 0 && <button className="btn btn-ghost btn-ghost-danger" onClick={() => setConfirmDeleteAll(true)}><IconTrash /> Xóa tất cả</button>}
                <button className="btn btn-ghost" onClick={exportCSV}><IconDownload /> Xuất CSV</button>
                <button className="btn btn-primary" onClick={openAddModal}><IconPlus /> Thêm mới</button>
              </>
            )}
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-box" style={{ background: "linear-gradient(135deg, #3b82f6, #60a5fa)" }}><IconChart /></div>
            <div className="stat-info"><div className="stat-label">Tổng mục</div><div className="stat-value">{currentStats.count}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-box" style={{ background: "linear-gradient(135deg, #059669, #34d399)" }}><IconWallet /></div>
            <div className="stat-info"><div className="stat-label">Tổng tiền</div><div className="stat-value stat-value-money">{formatMoney(currentStats.total)}đ</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-box" style={{ background: "linear-gradient(135deg, #0891b2, #22d3ee)" }}><IconCheck /></div>
            <div className="stat-info"><div className="stat-label">Đã thanh toán</div><div className="stat-value">{currentStats.paid}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-box" style={{ background: "linear-gradient(135deg, #dc2626, #f87171)" }}><IconClock /></div>
            <div className="stat-info"><div className="stat-label">Chưa thanh toán</div><div className="stat-value">{currentStats.unpaid}</div></div>
          </div>
        </div>

        <div className="filters-bar">
          <div className="search-box"><IconSearch /><input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <select className="filter-select" value={filterLoai} onChange={(e) => setFilterLoai(e.target.value)}>
            <option value="">Tất cả loại ấn phẩm</option>
            {productTypes.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
        </div>

        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 48, textAlign: "center" }}>#</th>
                  <th>Ngày</th>
                  {(activeTeam === "all" || activeTeam === "trash") && <th>Team</th>}
                  <th>Loại ấn phẩm</th>
                  <th style={{ textAlign: "center" }}>SL</th>
                  <th style={{ textAlign: "right" }}>Đơn giá</th>
                  <th style={{ textAlign: "right" }}>Thành tiền</th>
                  <th>Ghi chú</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 110, textAlign: "center" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={(activeTeam === "all" || activeTeam === "trash") ? 10 : 9}>
                    <div className="empty-state">
                      <div className="empty-icon"><IconReceipt /></div>
                      <h3>{activeTeam === "trash" ? "Thùng rác trống" : "Chưa có dữ liệu"}</h3>
                      <p>{activeTeam === "trash" ? "Không có mục nào đã xóa" : "Nhấn \"Thêm mới\" để bắt đầu"}</p>
                    </div>
                  </td></tr>
                ) : filteredRows.map((row, index) => {
                  const soTien = calcSoTien(row.soLuong, row.donGia);
                  const teamInfo = teams.find((t) => t.value === row.team);
                  return (
                    <tr key={row.id}>
                      <td style={{ textAlign: "center" }}><span className="row-num">{index + 1}</span></td>
                      <td>{row.ngay ? <span className="cell-date">{formatDate(row.ngay)}</span> : <span className="cell-empty">—</span>}</td>
                      {(activeTeam === "all" || activeTeam === "trash") && (
                        <td>{teamInfo ? <span className="team-pill" style={{ borderColor: teamInfo.color, color: teamInfo.color }}><span className="team-dot" style={{ background: teamInfo.color }} />{teamInfo.label}</span> : <span className="cell-empty">—</span>}</td>
                      )}
                      <td>{row.loaiAnPham ? <span className={getBadgeClass(row.loaiAnPham)}>{row.loaiAnPham}</span> : <span className="cell-empty">—</span>}</td>
                      <td style={{ textAlign: "center" }}><span className="cell-num">{row.soLuong || "—"}</span></td>
                      <td style={{ textAlign: "right" }}><span className="cell-money">{row.donGia ? formatMoney(Number(row.donGia)) : "—"}</span></td>
                      <td style={{ textAlign: "right" }}><span className="cell-total">{soTien > 0 ? formatMoney(soTien) + "đ" : "—"}</span></td>
                      <td><span className="cell-note">{row.ghiChu || "—"}</span></td>
                      <td>
                        <button className={`status-btn ${row.thanhToan === "Đã thanh toán" ? "paid" : "unpaid"}`} onClick={() => activeTeam !== "trash" && togglePayment(row.id)}>
                          <span className="status-dot" />
                          {row.thanhToan === "Đã thanh toán" ? "Đã TT" : "Chưa TT"}
                        </button>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="actions-cell">
                          {activeTeam === "trash" ? (
                            <>
                              <button className="action-btn edit" onClick={() => restoreRowFromTrash(row.id)} title="Khôi phục mục này"><IconUndo /></button>
                              <button className="action-btn delete" onClick={() => handleDelete(row.id)} title="Xóa vĩnh viễn"><IconTrash /></button>
                            </>
                          ) : (
                            <>
                              <button className="action-btn edit" onClick={() => openEditModal(row)} title="Chỉnh sửa"><IconEdit /></button>
                              <button className="action-btn delete" onClick={() => handleDelete(row.id)} title="Chuyển vào Thùng rác"><IconTrash /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredRows.length > 0 && (
            <div className="table-footer">
              <span className="footer-count">{filteredRows.length} mục</span>
              <span className="footer-total">Tổng: <strong>{formatMoney(filteredRows.reduce((s, r) => s + calcSoTien(r.soLuong, r.donGia), 0))}đ</strong></span>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditModal ? "Chỉnh sửa" : "Thêm mới"}</h2>
              <button className="modal-close" onClick={closeModal}><IconClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-section">
                <label className="form-label">Chọn Team <span className="required">*</span></label>
                <div className="team-grid">
                  {teams.map((team) => (
                    <button key={team.value} type="button" className={`team-card ${modalData.team === team.value ? "selected" : ""}`}
                      onClick={() => handleModalChange("team", team.value)}>
                      <div className="team-card-dot" style={{ background: team.gradient }} />
                      <span className="team-card-name">{team.label}</span>
                    </button>
                  ))}
                  <button type="button" className="team-card add-team-card" onClick={addNewTeam}>
                    <div className="team-card-dot" style={{ background: "var(--border)", display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><IconPlus /></div>
                    <span className="team-card-name">Thêm Team</span>
                  </button>
                </div>
              </div>
              <div className="form-section">
                <label className="form-label">Ngày</label>
                <input type="date" className="form-input" value={modalData.ngay} onChange={(e) => handleModalChange("ngay", e.target.value)} />
              </div>
              <div className="form-section">
                <label className="form-label">Loại ấn phẩm <span className="required">*</span></label>
                <div className="chip-group">
                  {productTypes.map((opt) => (
                    <button key={opt} type="button" className={`chip ${modalData.loaiAnPham === opt ? "selected" : ""}`}
                      onClick={() => handleModalChange("loaiAnPham", opt)}>{opt}</button>
                  ))}
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-section">
                  <label className="form-label">Số lượng</label>
                  <input type="number" className="form-input" value={modalData.soLuong}
                    onChange={(e) => handleModalChange("soLuong", e.target.value ? Number(e.target.value) : "")} placeholder="0" min={0} />
                </div>
                <div className="form-section">
                  <label className="form-label">Đơn giá (VNĐ)</label>
                  <input type="number" className="form-input" value={modalData.donGia}
                    onChange={(e) => handleModalChange("donGia", e.target.value ? Number(e.target.value) : "")} placeholder="0" min={0} />
                  <div className="preset-row">
                    {DON_GIA_PRESETS.map((p) => (
                      <button key={p.value} type="button" className={`preset-chip ${modalData.donGia === p.value ? "active" : ""}`}
                        onClick={() => handleModalChange("donGia", p.value)}>{p.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="amount-preview">
                <span>Thành tiền</span>
                <span className="amount-value">{formatMoney(calcSoTien(modalData.soLuong, modalData.donGia))}đ</span>
              </div>
              <div className="form-section">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-input form-textarea" value={modalData.ghiChu}
                  onChange={(e) => handleModalChange("ghiChu", e.target.value)} placeholder="Thêm ghi chú..." />
              </div>
              {isEditModal && (
                <div className="form-section">
                  <label className="form-label">Trạng thái thanh toán</label>
                  <select className="form-input" value={modalData.thanhToan} onChange={(e) => handleModalChange("thanhToan", e.target.value)}>
                    {THANH_TOAN_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Hủy</button>
              <button className="btn btn-primary" onClick={handleModalSubmit}>{isEditModal ? "Lưu thay đổi" : "Thêm mục"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Team Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cài đặt ứng dụng</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}><IconClose /></button>
            </div>
            <div className="modal-body">
              <p className="settings-desc">Quản lý các lựa chọn cho Ứng dụng. Dữ liệu sẽ tự động cập nhật trên tất cả thiết bị.</p>
              
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-white)', marginBottom: '12px' }}>1. Quản lý Team</h3>
              {editTeams.map((team, index) => (
                <div key={index} className="team-edit-row">
                  <div className="team-edit-color">
                    <input type="color" value={team.color}
                      onChange={(e) => {
                        updateTeamField(index, "color", e.target.value);
                        updateTeamField(index, "gradient", `linear-gradient(135deg, ${e.target.value}aa, ${e.target.value})`);
                      }} />
                  </div>
                  <div className="team-edit-field">
                    <label className="form-label">Tên hiển thị</label>
                    <input type="text" className="form-input" value={team.label}
                      onChange={(e) => updateTeamField(index, "label", e.target.value)} />
                  </div>
                  <button className="action-btn delete" style={{ marginBottom: '4px' }} onClick={() => removeTeam(index)} title="Xóa Team"><IconTrash /></button>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ width: '100%', marginBottom: '20px', borderStyle: 'dashed' }} onClick={addNewTeam}>
                  <IconPlus /> Thêm Team mới
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-white)', marginBottom: '12px' }}>2. Loại ấn phẩm</h3>
                {editProductTypes.map((type, index) => (
                  <div key={index} className="team-edit-row">
                    <div className="team-edit-field">
                      <input type="text" className="form-input" value={type}
                        onChange={(e) => {
                          const newArr = [...editProductTypes];
                          newArr[index] = e.target.value;
                          setEditProductTypes(newArr);
                        }} />
                    </div>
                    <button className="action-btn delete" style={{ marginBottom: '4px' }} onClick={() => setEditProductTypes(prev => prev.filter((_, i) => i !== index))} title="Xóa loại ấn phẩm"><IconTrash /></button>
                  </div>
                ))}
                <button className="btn btn-ghost" style={{ width: '100%', borderStyle: 'dashed' }} onClick={addNewProductType}>
                  <IconPlus /> Thêm Loại ấn phẩm
                </button>
              </div>
              <div className="settings-info">
                <div className="info-icon"><IconCloud /></div>
                <div>
                  <strong>Cloud Sync đã bật</strong>
                  <p>Dữ liệu được đồng bộ real-time qua Firebase. Bạn có thể truy cập từ bất kỳ thiết bị nào và dữ liệu sẽ không bị mất.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={saveSettingsChanges}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: "center", padding: "32px" }}>
              <div className="confirm-icon"><IconTrash /></div>
              <h3 className="confirm-title">{activeTeam === "trash" ? "Xóa vĩnh viễn mục này?" : "Chuyển vào Thùng rác?"}</h3>
              <p className="confirm-desc">
                {activeTeam === "trash"
                  ? "Dữ liệu sẽ bị xóa vĩnh viễn khỏi Firebase Cloud và không thể khôi phục."
                  : "Mục này sẽ chuyển vào Thùng rác. Bạn có thể khôi phục lại bất kỳ lúc nào."}
              </p>
              <div className="confirm-actions">
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Hủy</button>
                <button className="btn btn-danger" onClick={confirmDeleteRow}>{activeTeam === "trash" ? "Xóa vĩnh viễn" : "Chuyển vào Thùng rác"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete All */}
      {confirmDeleteAll && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteAll(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: "center", padding: "32px" }}>
              <div className="confirm-icon"><IconTrash /></div>
              <h3 className="confirm-title">{activeTeam === "trash" ? "Dọn sạch Thùng rác?" : "Chuyển tất cả vào Thùng rác?"}</h3>
              <p className="confirm-desc">
                {activeTeam === "trash"
                  ? `Sẽ xóa vĩnh viễn toàn bộ ${deletedRows.length} mục trong Thùng rác.`
                  : activeTeam === "all"
                  ? `Sẽ chuyển ${rows.length} mục vào Thùng rác.`
                  : `Sẽ chuyển ${rows.filter(r => r.team === activeTeam).length} mục của ${activeTeam} vào Thùng rác.`
                }
              </p>
              <div className="confirm-actions">
                <button className="btn btn-ghost" onClick={() => setConfirmDeleteAll(false)}>Hủy</button>
                <button className="btn btn-danger" onClick={deleteAllRows}>{activeTeam === "trash" ? "Dọn sạch vĩnh viễn" : "Xóa vào Thùng rác"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span>{t.message}</span>
            {t.onAction && (
              <button
                onClick={() => {
                  t.onAction?.();
                  setToasts(prev => prev.filter(item => item.id !== t.id));
                }}
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  border: 'none',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
