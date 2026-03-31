import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Search, User, Hash, Users, BookOpen, ChevronRight, ChevronDown, Database, TreeDeciduous, Maximize2, Minimize2, X, ChevronLeft, RefreshCw, Pencil } from "lucide-react";
import { BTree, type AnimationStep } from "./lib/BTree";
import { BTreeVisualizer } from "./components/BTreeVisualizer";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./lib/supabase";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Student {
  id: string;
  name: string;
  gender: "Nam" | "Nữ" | "Khác";
  birthDate?: string;
  major: string;
}

const INITIAL_STUDENTS: Student[] = [
  { id: "SV001", name: "Nguyễn Văn A", gender: "Nam", birthDate: "2002-05-15", major: "CNTT" },
  { id: "SV002", name: "Trần Thị B", gender: "Nữ", birthDate: "2003-08-22", major: "Kinh tế" },
  { id: "SV003", name: "Lê Văn C", gender: "Nam", birthDate: "2002-12-10", major: "Cơ khí" },
];

const SAMPLE_DATA: Student[] = [
  { id: "SV004", name: "Phạm Văn D", gender: "Nam", birthDate: "2002-01-10", major: "CNTT" },
  { id: "SV005", name: "Hoàng Thị E", gender: "Nữ", major: "Kinh tế" },
  { id: "SV006", name: "Vũ Văn F", gender: "Nam", birthDate: "2002-03-20", major: "Cơ khí" },
  { id: "SV007", name: "Đặng Thị G", gender: "Nữ", major: "Ngôn ngữ" },
  { id: "SV008", name: "Bùi Văn H", gender: "Nam", birthDate: "2002-05-30", major: "CNTT" },
  { id: "SV009", name: "Lý Thị I", gender: "Nữ", major: "Kinh tế" },
  { id: "SV010", name: "Chu Văn J", gender: "Nam", birthDate: "2002-07-10", major: "Cơ khí" },
  { id: "SV011", name: "Đỗ Thị K", gender: "Nữ", major: "Ngôn ngữ" },
  { id: "SV012", name: "Trịnh Văn L", gender: "Nam", birthDate: "2002-09-20", major: "CNTT" },
  { id: "SV013", name: "Ngô Thị M", gender: "Nữ", major: "Kinh tế" },
  { id: "SV014", name: "Dương Văn N", gender: "Nam", birthDate: "2002-11-30", major: "Cơ khí" },
  { id: "SV015", name: "Lâm Thị O", gender: "Nữ", major: "Ngôn ngữ" },
  { id: "SV016", name: "Đoàn Văn P", gender: "Nam", birthDate: "2002-01-10", major: "CNTT" },
  { id: "SV017", name: "Mai Thị Q", gender: "Nữ", major: "Kinh tế" },
  { id: "SV018", name: "Tô Văn R", gender: "Nam", birthDate: "2002-03-20", major: "Cơ khí" },
  { id: "SV019", name: "Hà Thị S", gender: "Nữ", major: "Ngôn ngữ" },
  { id: "SV020", name: "Lương Văn T", gender: "Nam", birthDate: "2002-05-30", major: "CNTT" },
  { id: "SV021", name: "Vương Thị U", gender: "Nữ", major: "Kinh tế" },
  { id: "SV022", name: "Tạ Văn V", gender: "Nam", birthDate: "2002-07-10", major: "Cơ khí" },
  { id: "SV023", name: "Phan Thị X", gender: "Nữ", major: "Ngôn ngữ" },
];

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    gender: "Nam",
    major: "CNTT"
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"id" | "name">("id");
  const [searchResults, setSearchResults] = useState<Student[] | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "visualize" | "storage">("table");
  const [statusMsg, setStatusMsg] = useState<{ type: "error" | "success", text: string } | null>(null);
  
  // Storage & Indexing simulation (Now used for visualization only)
  const [dataHeap, setDataHeap] = useState<(Student | null)[]>([]);
  const [idIndex, setIdIndex] = useState<BTree<number>>(new BTree<number>(3));
  const [nameIndex, setNameIndex] = useState<BTree<number>>(new BTree<number>(3));

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const [insertedKey, setInsertedKey] = useState<{ nodeId: string; key: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // Animation Player State
  const [animationSteps, setAnimationSteps] = useState<AnimationStep<number>[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000);
  const [visualizeType, setVisualizeType] = useState<'id' | 'name'>('id');
  const [visualizedTree, setVisualizedTree] = useState<BTree<number> | null>(null);
  const [originalTree, setOriginalTree] = useState<BTree<number> | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const normalizeKey = (key: string) => key.trim().normalize('NFC');

  const currentStep = currentStepIndex >= 0 ? animationSteps[currentStepIndex] : null;

  // Fetch students from Supabase
  const fetchStudents = useCallback(async (p: number = page) => {
    if (!supabase) {
      // If Supabase is not configured, we can't fetch data.
      // We'll show a warning in the UI instead.
      return;
    }
    setLoading(true);
    try {
      const { data, count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(p * pageSize, (p + 1) * pageSize - 1);

      if (error) throw error;

      if (data) {
        setStudents(data);
        setTotalCount(count || 0);
        setDataHeap(data); // Sync heap for visualization
      }
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setStatusMsg({ type: "error", text: "Lỗi khi tải dữ liệu từ Supabase: " + error.message });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // Initialize data
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Update local indexes when students change (for visualization)
  useEffect(() => {
    const idTree = new BTree<number>(3);
    const nameTree = new BTree<number>(3);
    students.forEach((s, index) => {
      if (s) {
        idTree.insert(normalizeKey(s.id), index);
        nameTree.insert(normalizeKey(s.name), index);
      }
    });
    setIdIndex(idTree);
    setNameIndex(nameTree);
    
    // Auto-update visualized tree if not animating
    if (!isAnimating) {
      setVisualizedTree(visualizeType === 'id' ? idTree : nameTree);
    }
  }, [students, visualizeType, isAnimating]);

  // Clear status message after 3 seconds
  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  const playNextStep = () => {
    if (currentStepIndex < animationSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const step = animationSteps[nextIndex];
      setCurrentStepIndex(nextIndex);

      // Update visualized tree structure from snapshot
      if (step.treeSnapshot) {
        const tempTree = new BTree<number>(3);
        tempTree.root = step.treeSnapshot;
        setVisualizedTree(tempTree);
      }

      // Reset highlights
      setHighlightedNodeId(null);
      setHighlightedKey(null);
      setInsertedKey(null);

      // Apply step effects
      switch (step.type) {
        case "highlight":
          setHighlightedNodeId(step.nodeId);
          break;
        case "compare":
          setHighlightedNodeId(step.nodeId);
          setHighlightedKey(step.key);
          break;
        case "insert_key":
          setHighlightedNodeId(step.nodeId);
          setInsertedKey({ nodeId: step.nodeId, key: step.key });
          break;
        case "found":
          setHighlightedNodeId(step.nodeId);
          setHighlightedKey(step.key);
          break;
        case "delete_key":
          setHighlightedNodeId(step.nodeId);
          setHighlightedKey(step.key);
          break;
        case "replace":
          setHighlightedNodeId(step.nodeId);
          setHighlightedKey(step.newKey);
          break;
        case "borrow":
        case "move_up":
          setHighlightedNodeId(step.toId);
          setInsertedKey({ nodeId: step.toId, key: step.key });
          break;
        case "merge":
          setHighlightedNodeId(step.leftId);
          break;
        case "split":
          setHighlightedNodeId(step.nodeId);
          break;
        case "not_found":
          setHighlightedNodeId(null);
          setHighlightedKey(null);
          break;
        case "done":
          setHighlightedNodeId(null);
          setHighlightedKey(null);
          setIsPlaying(false);
          setIsAnimating(false);
          break;
      }
    } else {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentStepIndex < animationSteps.length - 1) {
      timer = setTimeout(playNextStep, animationSpeed);
    } else if (currentStepIndex >= animationSteps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, animationSteps, animationSpeed]);

  const startVisualization = (steps: AnimationStep<number>[], type: 'id' | 'name', tree: BTree<number>) => {
    // Reset all animation states
    setHighlightedNodeId(null);
    setHighlightedKey(null);
    setInsertedKey(null);
    
    setOriginalTree(tree.clone());
    setVisualizedTree(tree.clone());
    setAnimationSteps(steps);
    setCurrentStepIndex(0);
    setVisualizeType(type);
    setIsAnimating(true);
    setIsPlaying(true);
    setActiveTab("visualize");
    
    // Initial step setup
    if (steps.length > 0) {
      const step = steps[0];
      if (step.treeSnapshot) {
        const tempTree = new BTree<number>(3);
        tempTree.root = step.treeSnapshot;
        setVisualizedTree(tempTree);
      }
      if (step.type === 'highlight') setHighlightedNodeId(step.nodeId);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.id || !newStudent.name) return;
    
    if (!supabase) {
      setStatusMsg({ type: "error", text: "Vui lòng cấu hình Supabase URL và Anon Key trong Settings!" });
      return;
    }

    setLoading(true);
    try {
      const student = {
        id: newStudent.id,
        name: newStudent.name,
        gender: newStudent.gender || "Nam",
        birthDate: newStudent.birthDate || null,
        major: newStudent.major || "CNTT"
      };

      const { error } = await supabase
        .from('students')
        .insert([student]);

      if (error) throw error;

      setStatusMsg({ type: "success", text: `Đã thêm sinh viên ${student.id} vào Supabase!` });
      setNewStudent({ gender: "Nam", major: "CNTT" });
      fetchStudents();
      
      // Visualize the local index update
      const nextIdIndex = idIndex.clone();
      nextIdIndex.insert(normalizeKey(student.id), students.length);
      startVisualization(nextIdIndex.steps, 'id', idIndex);
    } catch (error: any) {
      console.error('Error adding student:', error);
      setStatusMsg({ type: "error", text: "Lỗi khi thêm sinh viên: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!supabase) {
      setStatusMsg({ type: "error", text: "Vui lòng cấu hình Supabase URL và Anon Key trong Settings!" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStatusMsg({ type: "success", text: `Đã xóa sinh viên ${id} khỏi Supabase!` });
      fetchStudents();

      // Visualize the local index update
      const nextIdIndex = idIndex.clone();
      nextIdIndex.delete(normalizeKey(id));
      startVisualization(nextIdIndex.steps, 'id', idIndex);
    } catch (error: any) {
      console.error('Error deleting student:', error);
      setStatusMsg({ type: "error", text: "Lỗi khi xóa sinh viên: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    
    if (!supabase) {
      setStatusMsg({ type: "error", text: "Vui lòng cấu hình Supabase URL và Anon Key trong Settings!" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: editingStudent.name,
          gender: editingStudent.gender,
          birthDate: editingStudent.birthDate || null,
          major: editingStudent.major
        })
        .eq('id', editingStudent.id);

      if (error) throw error;

      setStatusMsg({ type: "success", text: `Đã cập nhật thông tin sinh viên ${editingStudent.id}!` });
      setEditingStudent(null);
      fetchStudents();
      
      // If we are in search mode, update the search results too
      if (searchResults) {
        setSearchResults(prev => prev ? prev.map(s => s.id === editingStudent.id ? editingStudent : s) : null);
      }
    } catch (error: any) {
      console.error('Error updating student:', error);
      setStatusMsg({ type: "error", text: "Lỗi khi cập nhật sinh viên: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    if (!supabase) {
      setStatusMsg({ type: "error", text: "Vui lòng cấu hình Supabase URL và Anon Key trong Settings!" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .ilike(searchType === 'id' ? 'id' : 'name', `%${searchQuery}%`);

      if (error) throw error;

      setSearchResults(data || []);
      
      if (data && data.length > 0) {
        setStatusMsg({ type: "success", text: `Đã tìm thấy ${data.length} sinh viên!` });
      } else {
        setStatusMsg({ type: "error", text: `Không tìm thấy sinh viên khớp với yêu cầu.` });
      }

      // Visualize local search for educational purposes
      const index = searchType === "id" ? idIndex : nameIndex;
      const searchTree = index.clone();
      searchTree.steps = [];
      searchTree.search(normalizeKey(searchQuery));
      startVisualization(searchTree.steps, searchType, index);
    } catch (error: any) {
      console.error('Error searching students:', error);
      setStatusMsg({ type: "error", text: "Lỗi khi tìm kiếm: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImportSamples = async () => {
    if (!supabase) {
      setStatusMsg({ type: "error", text: "Vui lòng cấu hình Supabase URL và Anon Key trong Settings!" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .insert(SAMPLE_DATA);

      if (error) throw error;

      setStatusMsg({ type: "success", text: `Đã import ${SAMPLE_DATA.length} sinh viên mẫu vào Supabase!` });
      
      // Build a preview tree immediately for visualization
      const previewTree = new BTree<number>(3);
      SAMPLE_DATA.slice(0, pageSize).forEach((s, i) => {
        previewTree.insert(s.id, i);
      });
      setVisualizedTree(previewTree);
      setOriginalTree(previewTree.clone());
      setActiveTab("visualize");
      setVisualizeType('id');
      setIsAnimating(false);
      setIsPlaying(false);
      setCurrentStepIndex(-1);
      setAnimationSteps([]);

      fetchStudents();
    } catch (error: any) {
      console.error('Error importing samples:', error);
      setStatusMsg({ type: "error", text: "Lỗi khi import: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-indigo-600" />
              Hệ Thống Quản Lý Sinh Viên
            </h1>
            <p className="text-slate-500 mt-1 italic">Minh họa cấu trúc dữ liệu B-Tree (Bậc 3)</p>
          </div>
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab("table")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === "table" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Database className="w-4 h-4" />
              Bảng Dữ Liệu
            </button>
            <button
              onClick={() => setActiveTab("visualize")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === "visualize" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <TreeDeciduous className="w-4 h-4" />
              Visualize Thao Tác
            </button>
            <button
              onClick={() => setActiveTab("storage")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === "storage" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Hash className="w-4 h-4" />
              Lưu Trữ & Index
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form & Search */}
          <div className="lg:col-span-4 space-y-6">
            {/* Add Student Form */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Thêm Sinh Viên Mới
              </h2>
              
              {statusMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    "mb-4 p-3 rounded-lg text-xs font-bold flex items-center gap-2",
                    statusMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                  )}
                >
                  {statusMsg.text}
                </motion.div>
              )}

              <form onSubmit={handleAddStudent} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mã SV</label>
                  <input
                    required
                    type="text"
                    placeholder="SV000"
                    value={newStudent.id || ""}
                    onChange={e => setNewStudent({ ...newStudent, id: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Họ và Tên</label>
                  <input
                    required
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={newStudent.name || ""}
                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giới tính</label>
                    <select
                      value={newStudent.gender}
                      onChange={e => setNewStudent({ ...newStudent, gender: e.target.value as any })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chuyên ngành</label>
                    <select
                      value={newStudent.major}
                      onChange={e => setNewStudent({ ...newStudent, major: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="CNTT">CNTT</option>
                      <option value="Kinh tế">Kinh tế</option>
                      <option value="Cơ khí">Cơ khí</option>
                      <option value="Ngôn ngữ">Ngôn ngữ</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày sinh</label>
                  <input
                    type="date"
                    value={newStudent.birthDate || ""}
                    onChange={e => setNewStudent({ ...newStudent, birthDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  Thêm vào hệ thống
                </button>
              </form>
            </section>

            {/* Search Section */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-600" />
                Tìm Kiếm Nhanh (Index)
              </h2>
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setSearchType("id")}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                      searchType === "id" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Mã SV
                  </button>
                  <button
                    onClick={() => setSearchType("name")}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                      searchType === "name" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Họ Tên
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={searchType === "id" ? "Nhập Mã SV..." : "Nhập Họ Tên..."}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  onClick={handleSearch}
                  className="w-full border-2 border-indigo-600 text-indigo-600 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                >
                  Tìm kiếm
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Display Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {activeTab === "table" ? (
                <motion.div
                  key="table-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Supabase Configuration Warning */}
                  {!supabase && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-amber-900 font-bold mb-1">Chưa cấu hình Supabase</h3>
                          <p className="text-amber-700 text-sm">
                            Để quản lý 10 triệu sinh viên, bạn cần kết nối với Supabase. 
                            Vui lòng thêm <strong>VITE_SUPABASE_URL</strong> và <strong>VITE_SUPABASE_ANON_KEY</strong> vào phần <strong>Settings &gt; Secrets</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search Results Overlay */}
                  {searchResults !== null && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4">
                        <button onClick={() => setSearchResults(null)} className="text-indigo-400 hover:text-indigo-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Kết quả tìm kiếm ({searchResults.length})
                      </h3>
                      {searchResults.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {searchResults.map(s => (
                            <div 
                              key={s.id} 
                              onClick={() => setEditingStudent(s)}
                              className="bg-white p-4 rounded-xl shadow-sm border border-indigo-100 flex items-center gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group relative"
                            >
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="w-3 h-3 text-indigo-400" />
                              </div>
                              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{s.name}</p>
                                <p className="text-xs text-slate-500">{s.id} • {s.major}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-indigo-600 italic">Không tìm thấy sinh viên nào khớp với yêu cầu.</p>
                      )}
                    </div>
                  )}

                  {/* Main Table */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-bottom border-slate-100 flex items-center justify-between">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Database className="w-5 h-5 text-indigo-600" />
                        Danh Sách Sinh Viên
                      </h2>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => fetchStudents()}
                          disabled={loading}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Làm mới dữ liệu"
                        >
                          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                        <button
                          onClick={handleImportSamples}
                          disabled={loading}
                          className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Import mẫu
                        </button>
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg">
                          Tổng: {totalCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto relative">
                      {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Đang tải...</span>
                          </div>
                        </div>
                      )}
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-y border-slate-100">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã SV</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Họ và Tên</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giới tính</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày sinh</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Chuyên ngành</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {students.length > 0 ? students.map((s) => (
                            <motion.tr
                              layout
                              key={s.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="hover:bg-slate-50 transition-colors group"
                            >
                              <td className="px-6 py-4 font-mono text-sm font-bold text-indigo-600">{s.id}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {s.name.charAt(0)}
                                  </div>
                                  <span className="font-medium">{s.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">{s.gender}</td>
                              <td className="px-6 py-4 text-sm text-slate-500">
                                {s.birthDate ? new Date(s.birthDate).toLocaleDateString('vi-VN') : <span className="italic text-slate-300">Chưa nhập</span>}
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase">
                                  {s.major}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setEditingStudent(s)}
                                    disabled={loading}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    title="Chỉnh sửa"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStudent(s.id)}
                                    disabled={loading}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Xóa sinh viên"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          )) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                Chưa có dữ liệu sinh viên. Hãy thêm mới hoặc import mẫu.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        Hiển thị {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} trong số {totalCount.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0 || loading}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-600 px-2">Trang {page + 1}</span>
                        <button
                          onClick={() => setPage(p => p + 1)}
                          disabled={(page + 1) * pageSize >= totalCount || loading}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === "storage" ? (
                <motion.div
                  key="storage-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Index Table */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          <Hash className="w-5 h-5 text-indigo-600" />
                          Bảng Index (B-Tree Leaf Nodes)
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã SV → Offset</span>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-slate-100">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-bottom border-slate-100">
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mã SV (Key)</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Offset (Pointer)</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {idIndex.clone().traverseAll().map((entry, idx) => (
                              <motion.tr 
                                key={entry.key}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="px-6 py-4 font-mono text-sm font-bold text-indigo-600">{entry.key}</td>
                                <td className="px-6 py-4 font-mono text-sm text-slate-500">0x{entry.value.toString(16).padStart(4, '0')}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Valid</span>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Data Heap (Original Table) */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          <Database className="w-5 h-5 text-indigo-600" />
                          Bảng Gốc (Data Heap / Storage)
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vật lý (Physical Storage)</span>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-slate-100">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-bottom border-slate-100">
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Offset</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dữ liệu Sinh Viên</th>
                              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kích thước</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {dataHeap.map((student, idx) => (
                              <motion.tr 
                                key={idx}
                                className={cn(
                                  "transition-colors",
                                  !student ? "bg-red-50/30" : "hover:bg-slate-50/50"
                                )}
                              >
                                <td className="px-6 py-4 font-mono text-xs text-slate-400">0x{idx.toString(16).padStart(4, '0')}</td>
                                <td className="px-6 py-4">
                                  {student ? (
                                    <div className="space-y-1">
                                      <div className="text-sm font-bold text-slate-700">{student.name}</div>
                                      <div className="text-[10px] text-slate-400 flex gap-2">
                                        <span>ID: {student.id}</span>
                                        <span>•</span>
                                        <span>{student.major}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs italic text-red-400 font-mono uppercase tracking-widest">[DELETED / HOLE]</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-mono text-[10px] text-slate-400">
                                  {student ? "128 bytes" : "0 bytes"}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="visualize-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Visualize Controls */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <TreeDeciduous className="w-5 h-5 text-indigo-600" />
                        Visualize Thao Tác: {visualizeType === 'id' ? 'Mã SV' : 'Họ Tên'}
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                          <button
                            onClick={() => setVisualizeType('id')}
                            className={cn(
                              "px-3 py-1 rounded text-[10px] font-bold transition-all",
                              visualizeType === 'id' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            Mã SV
                          </button>
                          <button
                            onClick={() => setVisualizeType('name')}
                            className={cn(
                              "px-3 py-1 rounded text-[10px] font-bold transition-all",
                              visualizeType === 'name' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            Họ Tên
                          </button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                          <span className="text-[10px] font-bold text-slate-500 px-2 uppercase">Tốc độ</span>
                          {[500, 1000, 2000].map(speed => (
                            <button
                              key={speed}
                              onClick={() => setAnimationSpeed(speed)}
                              className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold transition-all",
                                animationSpeed === speed ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              {speed === 500 ? "Nhanh" : speed === 1000 ? "Vừa" : "Chậm"}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            disabled={currentStepIndex >= animationSteps.length - 1}
                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                          >
                            {isPlaying ? "Pause" : "Play"}
                          </button>
                          <button
                            onClick={playNextStep}
                            disabled={currentStepIndex >= animationSteps.length - 1 || isPlaying}
                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                          >
                            Next Step
                          </button>
                          <button
                            onClick={() => {
                              setCurrentStepIndex(animationSteps.length - 1);
                              setIsPlaying(false);
                              const lastStep = animationSteps[animationSteps.length - 1];
                              if (lastStep.treeSnapshot) {
                                const tempTree = new BTree<number>(3);
                                tempTree.root = lastStep.treeSnapshot;
                                setVisualizedTree(tempTree);
                              }
                            }}
                            disabled={currentStepIndex >= animationSteps.length - 1}
                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                            title="Bỏ qua animation"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => {
                              setCurrentStepIndex(0);
                              setIsPlaying(false);
                              if (originalTree) {
                                setVisualizedTree(originalTree.clone());
                              }
                            }}
                            className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100"
                            title="Quay lại bước đầu"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            title={isMaximized ? "Thu nhỏ" : "Phóng to toàn màn hình"}
                          >
                            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setIsAnimating(false);
                              setIsPlaying(false);
                              setActiveTab("table");
                              setIsMaximized(false);
                            }}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                            title="Thoát chế độ Visualize"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Status Display */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className={cn(
                        "md:col-span-2 rounded-xl p-4 font-mono text-sm border shadow-sm",
                        currentStep?.type === 'found' || currentStep?.type === 'done' ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
                        currentStep?.type === 'not_found' ? "bg-rose-50 border-rose-200 text-rose-900" :
                        "bg-slate-50 border-slate-200 text-slate-900"
                      )}>
                        <div className="flex items-center justify-between opacity-60 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest">Bước {currentStepIndex + 1} / {animationSteps.length}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            currentStep?.type === 'found' || currentStep?.type === 'done' ? "bg-emerald-500 text-white" :
                            currentStep?.type === 'not_found' ? "bg-rose-500 text-white" :
                            "bg-indigo-500 text-white"
                          )}>
                            {currentStep?.type.toUpperCase()}
                          </span>
                        </div>
                        <p className="font-medium">
                          {currentStep?.description || "Sẵn sàng thực hiện thao tác..."}
                        </p>
                      </div>

                      {/* Technical Legend */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chú giải (Legend)</h4>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-sm border border-slate-800 bg-white"></div>
                          <span className="text-[10px] font-mono text-slate-600">Nút (Internal/Leaf)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-slate-500 border border-white"></div>
                          <span className="text-[10px] font-mono text-slate-600">Điểm neo (Anchor)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-0 border-t border-dashed border-slate-400"></div>
                          <span className="text-[10px] font-mono text-slate-600">Nhánh (Branch)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-sm bg-indigo-50 border border-indigo-500 border-dashed"></div>
                          <span className="text-[10px] font-mono text-slate-600">Đang xử lý (Active)</span>
                        </div>
                      </div>
                    </div>

                    {/* Tree Display */}
                    <div className={cn(
                      "w-full overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-inner transition-all duration-300",
                      isMaximized ? "fixed inset-0 z-50 p-12 overflow-auto bg-white/95 backdrop-blur-sm" : "p-8 min-h-[400px]"
                    )}>
                      {isMaximized && (
                        <div className="fixed top-6 right-6 z-[60] flex gap-2">
                          <button
                            onClick={() => setIsMaximized(false)}
                            className="p-3 rounded-full bg-white shadow-xl border border-slate-200 text-slate-600 hover:text-indigo-600 transition-all"
                            title="Thu nhỏ"
                          >
                            <Minimize2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                      <div className={cn(
                        "mx-auto transition-all duration-300",
                        isMaximized ? "w-[3000px]" : "w-[1000px]"
                      )}>
                        <svg 
                          width={isMaximized ? "3000" : "1000"} 
                          height={isMaximized ? "800" : "500"} 
                          viewBox={isMaximized ? "0 0 3000 800" : "0 0 1000 500"}
                        >
                          {visualizedTree && (
                            <BTreeVisualizer
                              node={visualizedTree.root}
                              x={isMaximized ? 1500 : 500}
                              y={30}
                              levelWidth={isMaximized ? 2800 : 800}
                              levelHeight={isMaximized ? 45 : 35}
                              highlightedNodeId={highlightedNodeId}
                              highlightedKey={highlightedKey}
                              insertedKey={insertedKey}
                              pendingKey={pendingKey}
                              visualizeType={visualizeType}
                            />
                          )}
                        </svg>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-indigo-600" />
                  Chỉnh sửa thông tin
                </h3>
                <button 
                  onClick={() => setEditingStudent(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateStudent} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mã SV (Không thể sửa)</label>
                  <input
                    type="text"
                    value={editingStudent.id}
                    disabled
                    className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg outline-none text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Họ và Tên</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.name}
                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giới tính</label>
                    <select
                      value={editingStudent.gender}
                      onChange={e => setEditingStudent({ ...editingStudent, gender: e.target.value as any })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chuyên ngành</label>
                    <select
                      value={editingStudent.major}
                      onChange={e => setEditingStudent({ ...editingStudent, major: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="CNTT">CNTT</option>
                      <option value="Kinh tế">Kinh tế</option>
                      <option value="Cơ khí">Cơ khí</option>
                      <option value="Ngôn ngữ">Ngôn ngữ</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày sinh</label>
                  <input
                    type="date"
                    value={editingStudent.birthDate || ""}
                    onChange={e => setEditingStudent({ ...editingStudent, birthDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
                  >
                    {loading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
