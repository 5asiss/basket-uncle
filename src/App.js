import React, { useState, useEffect, useRef } from "react";
import {
  ShoppingCart,
  Search,
  Home,
  User,
  Heart,
  Truck,
  MapPin,
  Plus,
  X,
  ChevronRight,
  Star,
  ArrowLeft,
  Check,
  Settings,
  Trash2,
  DollarSign,
  Package,
  Camera,
  Lock,
  Mail,
  Building,
  Navigation,
  FileText,
  Zap,
  Clock,
  Loader2,
  ClipboardList,
  List,
  FileSpreadsheet,
  Copy,
  Bell,
  AlertCircle,
  Calendar,
  Megaphone,
  Pencil,
  ThumbsUp,
  Flame,
  Sprout,
  Ban,
  RotateCcw,
  Archive,
  History,
  Receipt,
  RefreshCw,
  Share2,
  Globe,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
  updateDoc,
  setDoc,
  writeBatch,
  getDocs,
  increment,
  where,
} from "firebase/firestore";

// ------------------------------------------------------------------
// [1] 시스템 설정 (배포 시 사장님 키 입력 필수!)
// ------------------------------------------------------------------

// ※ 아래 firebaseConfig는 배포 단계(2단계)에서 발급받은 키로 교체해야 합니다.
const firebaseConfig = JSON.parse(__firebase_config); // 이 화면 테스트용 자동 설정
/* 실제 배포할 때는 위 줄을 지우고 아래 주석을 풀어서 키를 넣으세요.
const firebaseConfig = {
  apiKey: "AIzaSyA6fArLAOrr1dFpI-Dc2-F4p-oXxTn4vm4",
  authDomain: "basketuncle-a8cc2.firebaseapp.com",
  projectId: "basketuncle-a8cc2",
  storageBucket: "basketuncle-a8cc2.firebasestorage.app",
  messagingSenderId: "259540549344",
  appId: "1:259540549344:web:9bb40e83c651cbce9ada85"
};

*/

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

// 사장님의 구글 시트 주소
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyLOZvCzub903adaCIK-x38ubfkJyoS8VncZ8EOkfttmQcCuOFcilbVl9i4BaCmJ43t/exec";
// ------------------------------------------------------------------

const INITIAL_PRODUCTS = [];
const CATEGORIES = [
  "전체",
  "파격세일",
  "오늘도착",
  "과일",
  "채소",
  "쌀/잡곡",
  "축산물",
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [activeTab, setActiveTab] = useState("home");
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewState, setViewState] = useState("shop");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [orderInfo, setOrderInfo] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    detailAddress: "",
    zipcode: "",
    gateCode: "",
    request: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const daumPostcodeRef = useRef(null);
  const [addressSearchKeyword, setAddressSearchKeyword] = useState("");
  const [addressSearchResults, setAddressSearchResults] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [notification, setNotification] = useState(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [adminNoticeInput, setAdminNoticeInput] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingProductId, setEditingProductId] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "과일",
    seller: "내 농장",
    icon: "🍎",
    image: null,
    isSale: false,
    isTodayDelivery: false,
    isTasteGuaranteed: false,
    isBestSeller: false,
    stock: 100,
    deadlineDate: "",
    deadlineTime: "",
    isClosed: false,
  });
  const [todaySessionOrders, setTodaySessionOrders] = useState([]);
  const [myPhone, setMyPhone] = useState("");
  const [myOrderList, setMyOrderList] = useState([]);
  const [isSearchingMyOrder, setIsSearchingMyOrder] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [hiddenDemoIds, setHiddenDemoIds] = useState([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const sanitizeInput = (str) => {
    if (typeof str !== "string") return str;
    return str.replace(/[<>]/g, "").replace(/script/gi, "");
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth Error:", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    const script = document.createElement("script");
    script.src =
      "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => {
      unsubscribe();
      clearInterval(timer);
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const qOrders = query(collection(db, "orders"));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const loadedOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      loadedOrders.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

      if (orders.length > 0) {
        const changedOrder = loadedOrders.find((no) => {
          const oldOrder = orders.find((oo) => oo.id === no.id);
          return (
            oldOrder && oldOrder.status !== "배송중" && no.status === "배송중"
          );
        });
        if (changedOrder) {
          setNotification(
            `🚚 [배송시작] ${changedOrder.name}님의 상품이 출발했습니다!`
          );
          setTimeout(() => setNotification(null), 5000);
        }
      }
      setOrders(loadedOrders);
      setActiveOrders(loadedOrders.filter((o) => o.isArchived !== true));
      setArchivedOrders(loadedOrders.filter((o) => o.isArchived === true));
    });

    const qProducts = query(collection(db, "products"));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const loadedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      loadedProducts.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      const visibleDemos = INITIAL_PRODUCTS.filter(
        (p) => !hiddenDemoIds.includes(p.id)
      );
      setProducts([...loadedProducts, ...visibleDemos]);
    });

    const noticeRef = doc(db, "settings", "global");
    const unsubNotice = onSnapshot(noticeRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGlobalNotice(data.notice || "");
        setAdminNoticeInput(data.notice || "");
      }
    });
    return () => {
      unsubOrders();
      unsubProducts();
      unsubNotice();
    };
  }, [user, orders, hiddenDemoIds]);

  const isProductExpired = (product) => {
    if (product.isClosed) return true;
    if (!product.deadline) return false;
    return new Date(product.deadline) < currentTime;
  };

  const getRemainingTime = (deadline) => {
    if (!deadline) return null;
    const end = new Date(deadline);
    const now = currentTime;
    const diff = end - now;
    if (diff <= 0) return "마감";
    if (diff > 24 * 60 * 60 * 1000)
      return `${end.getMonth() + 1}월 ${end.getDate()}일 마감`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}시간 ${minutes}분 ${seconds}초 남음`;
  };

  const execDaumPostcode = () => {
    if (window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function (data) {
          let fullAddress = data.address;
          let extraAddress = "";
          if (data.addressType === "R") {
            if (data.bname !== "") extraAddress += data.bname;
            if (data.buildingName !== "")
              extraAddress +=
                extraAddress !== ""
                  ? `, ${data.buildingName}`
                  : data.buildingName;
            fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
          }
          setOrderInfo((prev) => ({
            ...prev,
            zipcode: data.zonecode,
            address: fullAddress,
          }));
          setShowAddressModal(false);
        },
        width: "100%",
        height: "100%",
      }).embed(daumPostcodeRef.current);
    } else {
      alert("주소 검색 서비스를 불러오는 중입니다.");
    }
  };

  useEffect(() => {
    if (showAddressModal && daumPostcodeRef.current) execDaumPostcode();
  }, [showAddressModal]);

  const handleMyOrderLookup = async () => {
    if (!myPhone || myPhone.length < 4) {
      showToast("전화번호를 올바르게 입력해주세요.");
      return;
    }
    setIsSearchingMyOrder(true);
    try {
      const q = query(collection(db, "orders"), where("phone", "==", myPhone));
      const snapshot = await getDocs(q);
      const myOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      myOrders.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setMyOrderList(myOrders);
      if (myOrders.length === 0) {
        showToast("조회된 주문 내역이 없습니다.");
      } else {
        showToast(`${myOrders.length}건의 주문을 찾았습니다.`);
      }
    } catch (error) {
      alert("조회 중 오류가 발생했습니다.");
    } finally {
      setIsSearchingMyOrder(false);
    }
  };

  const handleShareLink = () => {
    const url = window.location.href;
    try {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      showToast("쇼핑몰 주소가 복사되었습니다!");
    } catch (err) {
      alert("주소 복사에 실패했습니다.");
    }
  };

  const handleGoHome = () => {
    window.location.reload();
  };

  const handleSecretLogoClick = () => {
    const newCount = secretClickCount + 1;
    setSecretClickCount(newCount);
    if (newCount >= 5) {
      if (isAdminAuthenticated) {
        setViewState("admin");
      } else {
        setShowLoginModal(true);
      }
      setSecretClickCount(0);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasswordInput === "3150") {
      setIsAdminAuthenticated(true);
      setShowLoginModal(false);
      setViewState("admin");
      setAdminPasswordInput("");
      showToast("사장님, 환영합니다!");
    } else {
      alert("비밀번호가 틀렸습니다.");
      setAdminPasswordInput("");
    }
  };

  const saveNotice = async () => {
    try {
      const noticeRef = doc(db, "settings", "global");
      await setDoc(noticeRef, { notice: adminNoticeInput }, { merge: true });
      showToast("상단 공지가 저장되었습니다.");
    } catch (error) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const updateOrderStatus = async (orderId, currentStatus) => {
    let newStatus = "";
    if (currentStatus === "접수대기") newStatus = "배송중";
    else if (currentStatus === "배송중") newStatus = "배송완료";
    else return;
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      if (newStatus === "배송중")
        showToast("고객에게 배송 시작 알림톡을 발송했습니다!");
      else showToast("배송 완료 처리되었습니다.");
    } catch (error) {
      console.error(error);
    }
  };

  const deleteOrder = async (orderId) => {
    if (window.confirm("이 주문 기록을 영구 삭제하시겠습니까? (복구 불가)")) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
        showToast("주문 기록이 삭제되었습니다.");
      } catch (error) {
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const archiveAllOrders = async () => {
    if (activeOrders.length === 0) {
      showToast("마감할 주문이 없습니다.");
      return;
    }
    if (
      window.confirm(
        `현재 화면의 주문 ${activeOrders.length}건을 [이전내역]으로 이동하시겠습니까?`
      )
    ) {
      setIsArchiving(true);
      try {
        const batch = writeBatch(db);
        activeOrders.forEach((order) => {
          const ref = doc(db, "orders", order.id);
          batch.update(ref, { isArchived: true });
        });
        await batch.commit();
        showToast("성공! [이전내역] 탭에서 확인하세요.");
      } catch (error) {
        alert("처리 중 오류가 발생했습니다.");
      } finally {
        setIsArchiving(false);
      }
    }
  };

  const restoreOrder = async (orderId) => {
    if (window.confirm("이 주문을 다시 배송 목록으로 복구하시겠습니까?")) {
      try {
        const ref = doc(db, "orders", orderId);
        await updateDoc(ref, { isArchived: false });
        showToast("주문이 복구되었습니다.");
      } catch (error) {
        alert("복구 중 오류가 발생했습니다.");
      }
    }
  };

  const startEditProduct = (product) => {
    let dDate = "";
    let dTime = "";
    if (product.deadline) {
      const parts = product.deadline.split("T");
      if (parts.length === 2) {
        dDate = parts[0];
        dTime = parts[1];
      }
    }
    setNewProduct({
      ...product,
      deadlineDate: dDate,
      deadlineTime: dTime,
      isClosed: product.isClosed || false,
    });
    setEditingProductId(product.id);
    setViewState("admin-register");
  };

  const deleteProduct = async (id) => {
    if (window.confirm("정말 이 상품을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        showToast("상품이 영구 삭제되었습니다.");
      } catch (e) {
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const exportToGoogleSheet = async () => {
    if (activeOrders.length === 0) {
      alert("전송할 주문이 없습니다.");
      return;
    }
    if (
      !confirm(
        `${activeOrders.length}건의 주문 정보를 구글 시트로 전송하시겠습니까?`
      )
    )
      return;
    setIsExporting(true);
    let successCount = 0;
    try {
      for (const order of activeOrders) {
        const formData = new FormData();
        formData.append("name", order.name);
        formData.append("phone", order.phone);
        formData.append("email", order.email);
        formData.append("address", order.address);
        formData.append("detailAddress", order.detailAddress);
        formData.append("gateCode", order.gateCode);
        formData.append("request", order.request);
        const cartSummary = order.items.map((item) => item.name).join(", ");
        formData.append("cartItems", cartSummary);
        formData.append("cartJson", JSON.stringify(order.items));
        formData.append(
          "totalAmount",
          order.totalAmount.toLocaleString() + "원"
        );
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          body: formData,
          mode: "no-cors",
        });
        successCount++;
        await new Promise((r) => setTimeout(r, 500));
      }
      showToast(`${successCount}건 전송 완료!`);
    } catch (error) {
      alert("전송 중 오류가 발생했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  const copyPickingList = () => {
    const list = getPickingList();
    if (list.length === 0) return;
    let text = `[📅 ${new Date().toLocaleDateString()} 출고 집계]\n\n`;
    list.forEach((item) => {
      text += `- ${item.name}: ${item.qty}개\n`;
    });
    text += `\n총 ${activeOrders.length}건 주문 대기 중`;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    showToast("출고 리스트가 복사되었습니다!");
  };

  const handleOrderComplete = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("잠시 후 다시 시도해주세요.");
      return;
    }

    if (!orderInfo.name || !orderInfo.phone || !orderInfo.address) {
      showToast("필수 정보를 모두 입력해주세요.");
      alert("주문자 성함, 연락처, 배송지 정보는 필수입니다.");
      return;
    }
    if (orderInfo.phone.length < 10) {
      alert("올바른 전화번호를 입력해주세요.");
      return;
    }

    const sanitizedOrderInfo = {
      ...orderInfo,
      name: sanitizeInput(orderInfo.name),
      detailAddress: sanitizeInput(orderInfo.detailAddress),
      gateCode: sanitizeInput(orderInfo.gateCode),
      request: sanitizeInput(orderInfo.request),
    };

    setIsSubmitting(true);
    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

    const newOrder = {
      ...sanitizedOrderInfo,
      items: cart,
      totalAmount: totalAmount,
      status: "접수대기",
      createdAt: Timestamp.now(),
      orderNumber:
        new Date().toISOString().slice(0, 10).replace(/-/g, "") +
        "-" +
        Math.floor(Math.random() * 1000),
      isArchived: false,
    };

    try {
      await addDoc(collection(db, "orders"), newOrder);
      setTodaySessionOrders((prev) => [newOrder, ...prev]);
      for (const item of cart) {
        try {
          const productRef = doc(db, "products", item.id);
          await updateDoc(productRef, { stock: increment(-1) });
        } catch (err) {}
      }
      const updatedProducts = products.map((p) => {
        const countInCart = cart.filter((c) => c.id === p.id).length;
        if (countInCart > 0) {
          return { ...p, stock: Math.max(0, p.stock - countInCart) };
        }
        return p;
      });
      setProducts(updatedProducts);

      const formData = new FormData();
      Object.keys(sanitizedOrderInfo).forEach((key) =>
        formData.append(key, sanitizedOrderInfo[key])
      );
      formData.append("cartItems", cart.map((i) => i.name).join(", "));
      formData.append("cartJson", JSON.stringify(cart));
      formData.append("totalAmount", totalAmount + "원");
      fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        body: formData,
        mode: "no-cors",
      }).catch((e) => console.log(e));

      showToast(`주문 완료!`);
      setCheckoutStep(3);
      setCart([]);
    } catch (error) {
      alert("주문 실패.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPickingList = () => {
    const summary = {};
    activeOrders.forEach((order) => {
      if (order.status === "배송완료") return;
      order.items.forEach((item) => {
        if (summary[item.name]) {
          summary[item.name].qty += 1;
        } else {
          summary[item.name] = { name: item.name, qty: 1, icon: item.icon };
        }
      });
    });
    return Object.values(summary);
  };

  const addToCart = (product) => {
    if (isProductExpired(product)) {
      alert("판매가 종료된 상품입니다.");
      return;
    }
    const currentInCart = cart.filter((item) => item.id === product.id).length;
    if (currentInCart >= product.stock) {
      alert("남은 재고가 부족합니다.");
      return;
    }
    setCart([...cart, product]);
    showToast(`${product.name} 담기 완료`);
  };

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!newProduct.name || !newProduct.price) {
      showToast("정보를 입력해주세요.");
      return;
    }

    const safeName = sanitizeInput(newProduct.name);
    const safeSeller = sanitizeInput(newProduct.seller);

    let deadlineISO = null;
    if (newProduct.deadlineDate && newProduct.deadlineTime) {
      deadlineISO = `${newProduct.deadlineDate}T${newProduct.deadlineTime}`;
    }

    const productData = {
      ...newProduct,
      name: safeName,
      seller: safeSeller,
      price: parseInt(newProduct.price),
      stock: parseInt(newProduct.stock),
      deadline: deadlineISO,
      isClosed: newProduct.isClosed,
      rating: newProduct.rating || 0.0,
      reviews: newProduct.reviews || 0,
      imageColor: newProduct.imageColor || "bg-blue-100",
      isNew: true,
      createdAt: Timestamp.now(),
    };

    delete productData.deadlineDate;
    delete productData.deadlineTime;

    try {
      if (editingProductId) {
        const productRef = doc(db, "products", editingProductId);
        await updateDoc(productRef, productData);
        showToast("상품 정보가 수정되었습니다!");
      } else {
        await addDoc(collection(db, "products"), productData);
        showToast("상품이 안전하게 등록되었습니다!");
      }

      setViewState("admin");
      setNewProduct({
        name: "",
        price: "",
        category: "과일",
        seller: "내 농장",
        icon: "🍎",
        image: null,
        isSale: false,
        isTodayDelivery: false,
        isTasteGuaranteed: false,
        isBestSeller: false,
        stock: 100,
        deadlineDate: "",
        deadlineTime: "",
        isClosed: false,
      });
      setEditingProductId(null);
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.includes(searchQuery);
    let matchesCategory = true;
    if (activeCategory === "전체") matchesCategory = true;
    else if (activeCategory === "파격세일")
      matchesCategory = product.isSale === true;
    else if (activeCategory === "오늘도착")
      matchesCategory = product.isTodayDelivery === true;
    else matchesCategory = product.category === activeCategory;
    return matchesCategory && matchesSearch;
  });

  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  const ProductThumbnail = ({ product, size = "large" }) => {
    const sizeClass = size === "large" ? "h-32 text-6xl" : "w-12 h-12 text-2xl";
    if (product.image) {
      return (
        <div
          className={`${sizeClass} bg-gray-100 relative overflow-hidden flex items-center justify-center`}
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return (
      <div
        className={`${sizeClass} ${
          product.imageColor || "bg-gray-100"
        } flex items-center justify-center relative`}
      >
        {product.icon}
      </div>
    );
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image: reader.result, icon: null });
      };
      reader.readAsDataURL(file);
    }
  };

  if (viewState === "admin-register") {
    return (
      <div className="bg-white min-h-screen font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-gray-200 flex flex-col">
        <header className="bg-white p-4 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={() => {
              setViewState("admin");
              setEditingProductId(null);
              setNewProduct({
                name: "",
                price: "",
                category: "과일",
                seller: "내 농장",
                icon: "🍎",
                image: null,
                isSale: false,
                isTodayDelivery: false,
                stock: 100,
                deadlineDate: "",
                deadlineTime: "",
                isClosed: false,
              });
            }}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">
            {editingProductId ? "상품 정보 수정" : "새 상품 등록"}
          </h1>
        </header>
        <div className="flex-1 overflow-y-auto p-5 pb-24">
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                상품 사진
              </label>
              <div className="w-full h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 relative overflow-hidden group hover:border-green-500 transition-colors">
                {newProduct.image ? (
                  <>
                    <img
                      src={newProduct.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-bold flex items-center gap-2">
                        <Camera size={20} /> 사진 변경하기
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                      <Camera size={32} className="text-green-600" />
                    </div>
                    <p className="font-bold text-gray-500">
                      사진을 등록해주세요
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  상품명
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                  placeholder="예) 못난이 사과 5kg"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    가격 (원)
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    분류
                  </label>
                  <select
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 bg-white"
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, category: e.target.value })
                    }
                  >
                    {CATEGORIES.filter(
                      (c) =>
                        c !== "전체" && c !== "파격세일" && c !== "오늘도착"
                    ).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                    <Settings size={16} /> 판매 설정
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span
                      className={`text-xs font-bold ${
                        newProduct.isClosed ? "text-red-600" : "text-gray-400"
                      }`}
                    >
                      {newProduct.isClosed ? "🚫 판매 중지됨" : "🟢 판매 중"}
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={newProduct.isClosed}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            isClosed: e.target.checked,
                          })
                        }
                      />
                      <div
                        className={`block w-10 h-6 rounded-full ${
                          newProduct.isClosed ? "bg-red-500" : "bg-gray-300"
                        }`}
                      ></div>
                      <div
                        className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${
                          newProduct.isClosed ? "transform translate-x-4" : ""
                        }`}
                      ></div>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    판매 수량 (재고)
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                    value={newProduct.stock}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, stock: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      마감 날짜 (선택)
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={newProduct.deadlineDate}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          deadlineDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      마감 시간
                    </label>
                    <input
                      type="time"
                      className="w-full p-2 border rounded-lg text-sm bg-white"
                      value={newProduct.deadlineTime}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          deadlineTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  * 날짜/시간을 비워두면 마감 없이 계속 판매됩니다.
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  농장명
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  value={newProduct.seller}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, seller: e.target.value })
                  }
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-100">
                <h3 className="font-bold text-blue-800 text-sm flex items-center gap-2">
                  <Megaphone size={16} /> 홍보 태그 설정
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-blue-100">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-red-500"
                      checked={newProduct.isSale}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          isSale: e.target.checked,
                        })
                      }
                    />
                    <span className="text-xs font-bold text-gray-700">
                      ⚡ 파격세일
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-blue-100">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-green-600"
                      checked={newProduct.isTodayDelivery}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          isTodayDelivery: e.target.checked,
                        })
                      }
                    />
                    <span className="text-xs font-bold text-gray-700">
                      🚀 오늘도착
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-blue-100">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-yellow-500"
                      checked={newProduct.isTasteGuaranteed}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          isTasteGuaranteed: e.target.checked,
                        })
                      }
                    />
                    <span className="text-xs font-bold text-gray-700">
                      👍 맛보장(당도선별)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-blue-100">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-purple-500"
                      checked={newProduct.isBestSeller}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          isBestSeller: e.target.checked,
                        })
                      }
                    />
                    <span className="text-xs font-bold text-gray-700">
                      🔥 주문폭주
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="p-4 border-t border-gray-100 bg-white absolute bottom-0 left-0 right-0">
          <button
            onClick={handleRegisterSubmit}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-green-700 active:scale-95 transition-all"
          >
            {editingProductId ? "수정 완료" : "등록 완료"}
          </button>
        </div>
      </div>
    );
  }

  if (viewState.startsWith("admin")) {
    return (
      <div className="bg-gray-50 min-h-screen font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-gray-200 flex flex-col">
        <header className="bg-gray-800 text-white p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings size={20} />{" "}
              <h1 className="text-lg font-bold">사장님 통합 관리</h1>
            </div>
            <button
              onClick={() => setViewState("shop")}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-full border border-gray-600 transition-colors"
            >
              쇼핑몰로 가기
            </button>
          </div>
          <div className="flex gap-2 bg-gray-700 p-1 rounded-lg overflow-x-auto">
            <button
              onClick={() => setViewState("admin")}
              className={`flex-1 py-2 px-2 whitespace-nowrap text-xs font-bold rounded-md transition-colors ${
                viewState === "admin"
                  ? "bg-white text-gray-800"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              대시보드
            </button>
            <button
              onClick={() => setViewState("admin-orders")}
              className={`flex-1 py-2 px-2 whitespace-nowrap text-xs font-bold rounded-md transition-colors ${
                viewState === "admin-orders"
                  ? "bg-white text-gray-800"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              배송목록
            </button>
            <button
              onClick={() => setViewState("admin-picking")}
              className={`flex-1 py-2 px-2 whitespace-nowrap text-xs font-bold rounded-md transition-colors ${
                viewState === "admin-picking"
                  ? "bg-white text-gray-800"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              출고집계
            </button>
            <button
              onClick={() => setViewState("admin-history")}
              className={`flex-1 py-2 px-2 whitespace-nowrap text-xs font-bold rounded-md transition-colors ${
                viewState === "admin-history"
                  ? "bg-white text-gray-800"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              이전내역
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto pb-20">
          {viewState === "admin" && (
            <>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-6">
                <h2 className="text-yellow-800 text-sm font-bold mb-3 flex items-center gap-2">
                  <Megaphone size={16} /> 상단 공지 설정
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="예: 11/24 11시 마감, 태풍으로 조기 마감"
                    className="flex-1 p-2 text-sm border rounded-lg focus:outline-none focus:border-yellow-500"
                    value={adminNoticeInput}
                    onChange={(e) => setAdminNoticeInput(e.target.value)}
                  />
                  <button
                    onClick={saveNotice}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-600"
                  >
                    저장
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h2 className="text-gray-500 text-sm font-bold mb-4 flex items-center gap-2">
                  <DollarSign size={16} /> 오늘의 현황
                </h2>
                <div className="flex justify-between text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-800">
                      {activeOrders.length}건
                    </div>
                    <div className="text-xs text-gray-400">주문 접수</div>
                  </div>
                  <div className="w-px bg-gray-100"></div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {activeOrders
                        .reduce((sum, o) => sum + o.totalAmount, 0)
                        .toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">예상 매출</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Package size={18} /> 상품 관리
                </h3>
                <button
                  onClick={() => {
                    setEditingProductId(null);
                    setViewState("admin-register");
                  }}
                  className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Plus size={16} /> 상품 등록
                </button>
              </div>
              <div className="space-y-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-3 shadow-sm"
                  >
                    <div className="rounded-lg overflow-hidden border border-gray-100">
                      <ProductThumbnail product={product} size="small" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-gray-800">
                          {product.name}
                        </h4>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">
                          재고: {product.stock}
                        </span>
                        {product.isClosed && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold flex items-center gap-0.5">
                            <Ban size={10} />
                            판매중지
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {product.category} | {product.price.toLocaleString()}원
                      </p>
                      {product.deadline && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                          <Clock size={10} />{" "}
                          {getRemainingTime(product.deadline)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditProduct(product)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {viewState === "admin-orders" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800">
                  배송 목록 (오늘의 주문)
                </h3>
              </div>
              <button
                onClick={exportToGoogleSheet}
                disabled={isExporting}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-sm hover:bg-green-700 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isExporting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={20} />
                )}
                {isExporting ? "전송 중..." : "구글 시트로 배송명단 전송"}
              </button>

              {activeOrders.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  접수된 주문이 없습니다.
                </div>
              ) : null}
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 relative group"
                >
                  <div className="flex justify-between items-start mb-2 border-b border-gray-50 pb-2">
                    <div>
                      <span className="text-xs font-bold text-gray-400">
                        No. {order.orderNumber}
                      </span>
                      <h4 className="font-bold text-lg text-gray-800">
                        {order.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.status === "접수대기" && (
                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "접수대기")
                          }
                          className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-blue-700 transition-colors"
                        >
                          배송 시작
                        </button>
                      )}
                      {order.status === "배송중" && (
                        <button
                          onClick={() => updateOrderStatus(order.id, "배송중")}
                          className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-green-700 transition-colors"
                        >
                          배송 완료
                        </button>
                      )}
                      {order.status === "배송완료" && (
                        <span className="bg-gray-200 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-full">
                          완료됨
                        </span>
                      )}
                      <button
                        onClick={() => deleteOrder(order.id)}
                        className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50"
                        title="삭제(영구)"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex gap-2">
                      <MapPin
                        size={16}
                        className="text-green-600 flex-shrink-0"
                      />
                      <span className="text-gray-700">
                        {order.address} {order.detailAddress}
                      </span>
                    </div>
                    {order.gateCode && (
                      <div className="flex gap-2">
                        <Lock
                          size={16}
                          className="text-blue-600 flex-shrink-0"
                        />
                        <span className="text-blue-700 font-bold">
                          공동현관: {order.gateCode}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-gray-500"
                      >
                        <span>- {item.name}</span>
                        <span>{item.price.toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewState === "admin-picking" && (
            <div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-green-800 text-lg mb-1">
                      출고 필요 물량
                    </h3>
                    <p className="text-xs text-green-600">창고 전달용 리스트</p>
                  </div>
                  <button
                    onClick={copyPickingList}
                    className="bg-white text-green-700 border border-green-200 px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm hover:bg-green-50"
                  >
                    <Copy size={14} /> 텍스트 복사
                  </button>
                </div>
                <button
                  onClick={archiveAllOrders}
                  disabled={isArchiving}
                  className="w-full mt-2 bg-blue-100 text-blue-600 border border-blue-200 px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 hover:bg-blue-200 transition-colors"
                >
                  {isArchiving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Archive size={14} />
                  )}
                  {isArchiving ? "마감 처리 중..." : "금일 마감 (보관함 이동)"}
                </button>
              </div>
              <div className="space-y-3">
                {getPickingList().length === 0 ? (
                  <div className="text-center text-gray-400 py-10">
                    출고할 상품이 없습니다.
                  </div>
                ) : null}
                {getPickingList().map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{item.icon}</div>
                      <span className="font-bold text-lg text-gray-700">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {item.qty}개
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewState === "admin-history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4 bg-gray-100 p-3 rounded-lg">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <History size={18} /> 지난 주문 내역
                </h3>
                <span className="text-xs text-gray-500">
                  총 {archivedOrders.length}건 보관됨
                </span>
              </div>

              {archivedOrders.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  보관된 주문이 없습니다.
                </div>
              ) : null}
              {archivedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative opacity-80 hover:opacity-100 transition-opacity"
                >
                  <div className="flex justify-between items-start mb-2 border-b border-gray-200 pb-2">
                    <div>
                      <span className="text-xs font-bold text-gray-400">
                        {order.createdAt
                          ? new Date(
                              order.createdAt.seconds * 1000
                            ).toLocaleDateString()
                          : "날짜없음"}
                      </span>
                      <h4 className="font-bold text-gray-600">
                        {order.name} (마감됨)
                      </h4>
                    </div>
                    <button
                      onClick={() => restoreOrder(order.id)}
                      className="bg-white border border-gray-300 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center gap-1"
                    >
                      <RotateCcw size={12} /> 복구
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    {order.items.map((item, idx) => (
                      <span key={idx} className="mr-2">
                        {item.name} ({item.price.toLocaleString()})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans pb-20 max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-gray-200">
      {notification && (
        <div className="fixed top-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-xl shadow-2xl z-[70] animate-in slide-in-from-top-10 flex items-center gap-3">
          <Bell className="text-yellow-300 animate-pulse" />
          <span className="font-bold text-sm">{notification}</span>
        </div>
      )}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-bold z-[100] animate-in fade-in slide-in-from-top-5 shadow-lg flex items-center gap-2">
          <Check size={14} className="text-green-400" /> {toastMessage}
        </div>
      )}

      <header className="bg-green-600 text-white p-4 sticky top-0 z-10 shadow-md">
        {globalNotice && (
          <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold text-center py-1 flex items-center justify-center gap-1 animate-pulse">
            <Megaphone size={12} /> {globalNotice}
          </div>
        )}
        <div
          className={`flex justify-between items-center mb-4 ${
            globalNotice ? "mt-4" : ""
          }`}
        >
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={handleSecretLogoClick}
          >
            <div className="bg-white p-1 rounded-full">
              <Truck size={20} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold">바구니삼촌</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShareLink}
              className="text-white/80 hover:text-white transition-colors"
            >
              <Share2 size={22} />
            </button>
            <button
              onClick={handleGoHome}
              className="text-white/80 hover:text-white transition-colors"
            >
              <Globe size={22} />
            </button>
            <div
              className="relative cursor-pointer"
              onClick={() => {
                setIsCartOpen(true);
                setCheckoutStep(1);
              }}
            >
              <ShoppingCart size={24} />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="찾으시는 농산물이 있나요?"
            className="w-full p-3 pl-10 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        </div>
      </header>

      <div className="bg-white p-2 flex gap-2 overflow-x-auto border-b border-gray-100 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeCategory === cat
                ? "bg-green-600 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } ${
              cat === "파격세일" && activeCategory !== cat
                ? "text-red-600 bg-red-50 hover:bg-red-100"
                : ""
            } ${
              cat === "오늘도착" && activeCategory !== cat
                ? "text-green-600 bg-green-50 hover:bg-green-100"
                : ""
            }`}
          >
            {cat === "파격세일" && <Zap size={14} fill="currentColor" />}
            {cat === "오늘도착" && <Clock size={14} />}
            {cat}
          </button>
        ))}
      </div>

      <main className="p-4">
        {activeTab === "my" ? (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Receipt size={20} className="text-green-600" /> 오늘 구매 내역
            </h2>

            {todaySessionOrders.length > 0 ? (
              <div className="space-y-4">
                {todaySessionOrders.map((order) => (
                  <div
                    key={order.orderNumber}
                    className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start border-b border-gray-50 pb-3 mb-3">
                      <div>
                        <span className="text-xs text-gray-400 font-bold block mb-1">
                          {new Date().toLocaleDateString()} (오늘)
                        </span>
                        <h4 className="font-bold text-gray-800 text-lg">
                          주문번호 {order.orderNumber}
                        </h4>
                      </div>
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-600">
                        접수완료
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600 flex-1 truncate pr-4">
                            {item.name}
                          </span>
                          <span className="font-medium text-gray-800">
                            {item.price.toLocaleString()}원
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50 -mx-5 -mb-5 p-4 border-t border-gray-100 mt-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">결제 금액</span>
                        <span className="text-xl font-bold text-green-700">
                          {order.totalAmount.toLocaleString()}원
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin size={12} /> {order.address}{" "}
                        {order.detailAddress}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                <div className="bg-gray-100 p-4 rounded-full mb-3">
                  <RefreshCw size={30} className="text-gray-400" />
                </div>
                <p>오늘 주문한 내역이 없습니다.</p>
              </div>
            )}

            <div className="mt-8 bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-xs text-yellow-800">
              <h4 className="font-bold mb-1 flex items-center gap-1">
                <AlertCircle size={14} /> 안내사항
              </h4>
              <p>
                • 이 화면에는 <b>현재 접속 상태에서 주문한 내역</b>만
                표시됩니다.
              </p>
              <p>• 페이지를 닫거나 새로고침하면 목록이 초기화됩니다.</p>
              <p>
                • <b>지난 주문 상세 내역은 주문 시 입력하신 이메일</b>로
                발송되니 메일함을 확인해주세요.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {activeCategory === "전체"
                  ? "방금 올라온 신선식품"
                  : `${activeCategory} 모음`}
              </h2>
              <span className="text-xs text-gray-500">
                배송지역: 연수구 송도
              </span>
            </div>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p>상품이 없습니다. 사장님 모드에서 상품을 등록해주세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map((product) => {
                  const expired = isProductExpired(product);
                  const soldOut = product.stock === 0;
                  const isDisabled = expired || soldOut;
                  return (
                    <div
                      key={product.id}
                      className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 flex flex-col relative group ${
                        isDisabled ? "opacity-60 grayscale" : ""
                      }`}
                    >
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                        {product.isNew && (
                          <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            NEW
                          </span>
                        )}
                        {product.isSale && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                            <Zap size={10} fill="currentColor" />
                            세일
                          </span>
                        )}
                        {product.isTodayDelivery && (
                          <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                            <Truck size={10} />
                            오늘도착
                          </span>
                        )}
                        {product.isTasteGuaranteed && (
                          <span className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                            <ThumbsUp size={10} />
                            맛보장
                          </span>
                        )}
                        {product.isBestSeller && (
                          <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                            <Flame size={10} />
                            주문폭주
                          </span>
                        )}
                      </div>

                      {isDisabled && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                          <span
                            className={`text-white font-bold px-4 py-2 rounded-full shadow-lg transform -rotate-12 border-2 border-white text-lg ${
                              expired ? "bg-gray-600" : "bg-red-600"
                            }`}
                          >
                            {expired ? "판매종료" : "품절"}
                          </span>
                        </div>
                      )}

                      <ProductThumbnail product={product} size="large" />
                      {product.image ? null : (
                        <button className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full hover:bg-white text-gray-400 hover:text-red-500 transition-colors z-10">
                          <Heart size={16} />
                        </button>
                      )}

                      <div className="p-3 flex-1 flex flex-col">
                        <div className="flex items-center gap-1 text-xs text-green-600 font-medium mb-1">
                          <MapPin size={12} /> 산지직송
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                          <User size={12} /> {product.seller}
                          <span className="flex items-center text-yellow-500 ml-1">
                            <Star size={10} fill="currentColor" />{" "}
                            {product.rating || "신규"}
                          </span>
                        </div>

                        {!isDisabled && (
                          <div className="mb-2 space-y-1">
                            <p
                              className={`text-[10px] font-bold flex items-center gap-1 ${
                                product.stock < 5
                                  ? "text-red-500 animate-pulse"
                                  : "text-gray-500"
                              }`}
                            >
                              <Package size={10} /> 남은수량: {product.stock}개{" "}
                              {product.stock < 5 ? "(매진임박)" : ""}
                            </p>
                            {product.deadline && (
                              <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                                <Clock size={10} />{" "}
                                {getRemainingTime(product.deadline)}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-auto flex justify-between items-center">
                          <div>
                            {product.isSale && product.originalPrice && (
                              <span className="text-xs text-gray-400 line-through block">
                                {product.originalPrice.toLocaleString()}원
                              </span>
                            )}
                            <span
                              className={`font-bold text-lg ${
                                product.isSale
                                  ? "text-red-600"
                                  : "text-gray-800"
                              }`}
                            >
                              {product.price.toLocaleString()}원
                            </span>
                          </div>
                          <button
                            onClick={() => addToCart(product)}
                            disabled={isDisabled}
                            className={`p-2 rounded-full transition-colors active:scale-95 ${
                              isDisabled
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 grid grid-cols-4 p-0 z-30">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center gap-1 py-3 ${
            activeTab === "home"
              ? "text-green-600"
              : "text-gray-400 hover:text-gray-800"
          }`}
        >
          <Home size={24} />
          <span className="text-[10px]">홈</span>
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`flex flex-col items-center justify-center gap-1 py-3 ${
            activeTab === "search"
              ? "text-green-600"
              : "text-gray-400 hover:text-gray-800"
          }`}
        >
          <Search size={24} />
          <span className="text-[10px]">검색</span>
        </button>
        <button
          onClick={() => setActiveTab("heart")}
          className={`flex flex-col items-center justify-center gap-1 py-3 ${
            activeTab === "heart"
              ? "text-green-600"
              : "text-gray-400 hover:text-gray-800"
          }`}
        >
          <Heart size={24} />
          <span className="text-[10px]">찜</span>
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`flex flex-col items-center justify-center gap-1 py-3 ${
            activeTab === "my"
              ? "text-green-600"
              : "text-gray-400 hover:text-gray-800"
          }`}
        >
          <User size={24} />
          <span className="text-[10px]">마이</span>
        </button>
      </nav>

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <Lock size={20} className="text-green-600" /> 사장님 모드
              </h3>
              <button onClick={() => setShowLoginModal(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAdminLogin}>
              <p className="text-sm text-gray-500 mb-2">
                관리자 비밀번호를 입력해주세요.
              </p>
              <input
                type="password"
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-center text-lg tracking-widest focus:border-green-500 focus:outline-none"
                placeholder="****"
                autoFocus
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700"
              >
                확인
              </button>
            </form>
          </div>
        </div>
      )}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-auto max-h-[60vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {checkoutStep === 1 && (
                  <>
                    <ShoppingCart className="text-green-600" /> 장바구니
                  </>
                )}
                {checkoutStep === 2 && (
                  <>
                    <Settings className="text-green-600" /> 주문 / 배송 정보
                  </>
                )}
                {checkoutStep === 3 && (
                  <>
                    <Check className="text-green-600" /> 주문 완료
                  </>
                )}
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {checkoutStep === 1 && (
                <>
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                      <ShoppingCart size={48} className="opacity-20" />{" "}
                      <p>장바구니가 비어있습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item, index) => (
                        <div
                          key={index}
                          className="flex gap-4 items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100"
                        >
                          <div className="rounded-lg overflow-hidden border border-gray-100">
                            <ProductThumbnail product={item} size="small" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">
                              {item.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {item.seller}
                            </p>
                            <p className="font-bold text-green-700">
                              {item.price.toLocaleString()}원
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="text-gray-400 hover:text-red-500 p-2"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {checkoutStep === 2 && (
                <form
                  id="orderForm"
                  onSubmit={handleOrderComplete}
                  className="space-y-4"
                >
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 text-sm">
                      주문자 정보
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          받는 분 성함
                        </label>
                        <input
                          required
                          type="text"
                          className="w-full p-2 border rounded-lg text-sm"
                          placeholder="이름을 입력하세요"
                          value={orderInfo.name}
                          onChange={(e) =>
                            setOrderInfo({ ...orderInfo, name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          연락처
                        </label>
                        <input
                          required
                          type="tel"
                          className="w-full p-2 border rounded-lg text-sm"
                          placeholder="010-1234-5678"
                          value={orderInfo.phone}
                          onChange={(e) =>
                            setOrderInfo({
                              ...orderInfo,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          이메일 (계좌정보 수신용)
                        </label>
                        <input
                          required
                          type="email"
                          className="w-full p-2 border rounded-lg text-sm"
                          placeholder="example@email.com"
                          value={orderInfo.email}
                          onChange={(e) =>
                            setOrderInfo({
                              ...orderInfo,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 text-sm">
                      배송지 검색 (Daum 주소)
                    </h3>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(true)}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-colors ${
                          orderInfo.address
                            ? "bg-white border-green-500 text-green-700"
                            : "bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <Search size={18} />
                        {orderInfo.address ? "주소 재검색" : "주소 검색"}
                      </button>
                      {orderInfo.address && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-100 animate-in fade-in">
                          <div className="flex gap-2 items-start">
                            <MapPin
                              size={16}
                              className="text-green-600 mt-1 flex-shrink-0"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-800">
                                {orderInfo.address} ({orderInfo.zipcode})
                              </p>
                              <input
                                type="text"
                                placeholder="상세주소 입력 (예: 101동 202호)"
                                className="w-full mt-2 p-2 text-sm border border-gray-300 rounded focus:border-green-500 focus:outline-none bg-white"
                                required
                                value={orderInfo.detailAddress}
                                onChange={(e) =>
                                  setOrderInfo({
                                    ...orderInfo,
                                    detailAddress: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
                      <FileText size={16} className="text-green-600" /> 비고 /
                      요청사항
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          공동현관 출입번호 (기사님 확인용)
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-green-500 transition-colors"
                          placeholder="예: #1234, 경비실 호출, 없음"
                          value={orderInfo.gateCode}
                          onChange={(e) =>
                            setOrderInfo({
                              ...orderInfo,
                              gateCode: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          배송 요청사항
                        </label>
                        <textarea
                          className="w-full p-2 border rounded-lg text-sm resize-none bg-gray-50 focus:bg-white focus:border-green-500 transition-colors"
                          rows="2"
                          placeholder="예: 문 앞에 놔주세요, 배송 전 연락주세요"
                          value={orderInfo.request}
                          onChange={(e) =>
                            setOrderInfo({
                              ...orderInfo,
                              request: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </form>
              )}
              {checkoutStep === 3 && (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                    <Check size={40} strokeWidth={3} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    주문이 접수되었습니다!
                  </h2>
                  <p className="text-gray-500 text-sm">
                    아래 계좌로 입금해주시면 배송이 시작됩니다.
                  </p>

                  {/* [수정됨] 계좌정보 표시 */}
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 w-full text-center shadow-sm">
                    <h3 className="font-bold text-blue-800 mb-2 text-sm">
                      입금하실 계좌
                    </h3>
                    <div className="text-xl font-black text-blue-900 mb-1">
                      수협 7010-6668-1661
                    </div>
                    <p className="text-sm text-blue-700">예금주: 금창권</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200 w-full mt-4 text-left shadow-sm space-y-3">
                    <h4 className="font-bold text-sm text-gray-700 border-b border-gray-100 pb-2 mb-2">
                      주문 요약
                    </h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">받는 분</span>
                      <span className="font-bold text-gray-800">
                        {orderInfo.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">주소</span>
                      <span className="font-bold text-gray-800 text-right w-2/3 truncate">
                        {orderInfo.address} {orderInfo.detailAddress}
                      </span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-100">
                      <h4 className="font-bold text-sm text-gray-700 mb-1 flex items-center gap-2">
                        <Mail size={14} /> 안내 메일 발송됨
                      </h4>
                      <p className="text-sm text-green-700 font-bold">
                        {orderInfo.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white sm:rounded-b-2xl">
              {checkoutStep === 1 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold text-gray-600">총 결제금액</span>
                    <span className="font-bold text-2xl text-green-700">
                      {totalAmount.toLocaleString()}원
                    </span>
                  </div>
                  <button
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                      cart.length === 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]"
                    }`}
                    disabled={cart.length === 0}
                    onClick={() => setCheckoutStep(2)}
                  >
                    주문하기 <ChevronRight size={20} />
                  </button>
                </div>
              )}
              {checkoutStep === 2 && (
                <button
                  form="orderForm"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-green-700 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" /> 처리중...
                    </>
                  ) : (
                    `${totalAmount.toLocaleString()}원 결제하기`
                  )}
                </button>
              )}
              {checkoutStep === 3 && (
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full bg-gray-100 text-gray-700 font-bold py-4 rounded-xl text-lg hover:bg-gray-200 transition-all"
                >
                  쇼핑 계속하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* [실전] Daum 주소 검색 모달 (Embed 방식) */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm h-[450px] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-gray-800 ml-2">주소 검색</h3>
              <button onClick={() => setShowAddressModal(false)}>
                <X size={24} className="text-gray-400 hover:text-black" />
              </button>
            </div>
            {/* 다음 주소 API가 여기에 들어옵니다 */}
            <div
              ref={daumPostcodeRef}
              className="flex-1 w-full h-full bg-gray-50"
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
