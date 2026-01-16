import React, { useState } from "react";
// เพิ่ม Import ไอคอนให้ครบถ้วนเพื่อแก้ปัญหาจอขาว
import {
  ShoppingCart,
  CheckCircle,
  Download,
  Calendar,
  Truck,
  Flower,
  PlusCircle,
  User,
  Phone,
  Mail,
  MapPin,
  ImageIcon,
} from "lucide-react";

import payment from "./assets/payment.jpg";
import {
  ImageModal,
  HomeView,
  CatalogView,
  CustomizerView,
  CartView,
  CheckoutView, // ใช้ Component นี้
  PaymentView, // ใช้ Component นี้
  VerifyingView,
  SuccessView, // ใช้ Component นี้
} from "./components";

import {
  SHIPPING_FEE,
  RIBBON_COLORS,
  RING_COLORS,
  BASE_FLOWERS_COUNT,
} from "./constants/index";

import { generateCartId, groupFlowers } from "./utils/helpers";

const App = () => {
  const [step, setStep] = useState("home");
  const [cart, setCart] = useState([]);
  const [customFlowers, setCustomFlowers] = useState([]);
  const [selectedRibbon, setSelectedRibbon] = useState(RIBBON_COLORS[0]);
  const [selectedRing, setSelectedRing] = useState(RING_COLORS[0]);
  const [editingCartId, setEditingCartId] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });
  const [paymentSlip, setPaymentSlip] = useState(null);
  const [orderId, setOrderId] = useState("");
  const [orderTime, setOrderTime] = useState("");
  const [activePreviewImage, setActivePreviewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const totalPrice =
    cart.reduce((sum, item) => sum + item.price, 0) +
    (cart.length > 0 ? SHIPPING_FEE : 0);

  const handleAddToCart = (item) => {
    if (editingCartId) {
      setCart(
        cart.map((c) =>
          c.cartId === editingCartId ? { ...item, cartId: editingCartId } : c
        )
      );
      setEditingCartId(null);
    } else {
      setCart([...cart, { ...item, cartId: generateCartId() }]);
    }
    setStep("cart");
  };

  const handleConfirmPayment = async () => {
    // เพิ่ม async
    if (!paymentSlip) {
      alert("กรุณาแนบสลิปโอนเงิน");
      return;
    }

    setIsLoading(true);

    // 1. เตรียมข้อมูล Object (เหมือนเดิมที่คุณทำไว้)
    const orderPayload = {
      orderId: "ORD-" + Math.random().toString(36).toUpperCase().substr(2, 8),
      orderTime: new Date().toISOString(),
      customerInfo: { ...customerInfo },
      items: cart.map((item) => ({
        id: item.cartId,
        name: item.name,
        type: item.type,
        price: item.price,
        details: item.type === "custom" ? item.details : null,
        snapshot: item.snapshot, // ส่งรูปช่อดอกไม้ไปด้วยถ้ามี
      })),
      summary: {
        subtotal: cart.reduce((sum, item) => sum + item.price, 0),
        shippingFee: SHIPPING_FEE,
        totalPrice: totalPrice,
      },
    };

    // 2. ใช้ FormData เพื่อรวมข้อมูลและ "ไฟล์รูปภาพสลิป"
    const formData = new FormData();
    formData.append("orderData", JSON.stringify(orderPayload)); // ใส่ข้อมูลออเดอร์
    formData.append("slip", paymentSlip); // ใส่ไฟล์สลิปจริง

    try {
      // 3. ส่งไปที่ Backend จริง (เปลี่ยน URL ตามเครื่อง Server ของคุณ)
      const response = await fetch("http://72.62.243.238:5000/api/orders", {
        method: "POST",
        body: formData, // ส่ง FormData
      });

      if (response.ok) {
        // 4. ถ้า Backend บันทึกสำเร็จ ถึงค่อยเปลี่ยนหน้า
        setStep("verifying");
        setOrderId(orderPayload.orderId);
        setOrderTime(new Date().toLocaleString("th-TH"));

        setTimeout(() => {
          setIsLoading(false);
          setStep("success");
        }, 2000);
      } else {
        alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("เชื่อมต่อ Server ล้มเหลว");
      setIsLoading(false);
    }
  };

  const resetOrder = () => {
    setCart([]);
    setCustomFlowers([]);
    setStep("home");
    setPaymentSlip(null);
    setCustomerInfo({ name: "", address: "", phone: "", email: "" });
  };

  const renderContent = () => {
    switch (step) {
      case "home":
        return (
          <HomeView
            onStartCustom={() => {
              setCustomFlowers([]);
              setEditingCartId(null);
              setStep("custom");
            }}
            onGoCatalog={() => setStep("catalog")}
          />
        );
      case "catalog":
        return (
          <CatalogView onBack={() => setStep("home")} onAdd={handleAddToCart} />
        );
      case "custom":
        return (
          <CustomizerView
            flowers={customFlowers}
            setFlowers={setCustomFlowers}
            ribbon={selectedRibbon}
            setRibbon={setSelectedRibbon}
            ring={selectedRing}
            setRing={setSelectedRing}
            onAdd={handleAddToCart}
            onBack={() => setStep(editingCartId ? "cart" : "home")}
            editingId={editingCartId}
          />
        );
      case "cart":
        return (
          <CartView
            cart={cart}
            onAddMore={() => setStep("home")}
            onRemove={(id) => setCart(cart.filter((i) => i.cartId !== id))}
            onEdit={(item) => {
              setCustomFlowers([...item.details]);
              setSelectedRibbon(item.ribbon);
              setSelectedRing(item.ring);
              setEditingCartId(item.cartId);
              setStep("custom");
            }}
            onCheckout={() => setStep("checkout")}
            onViewImage={setActivePreviewImage}
          />
        );

      // แก้ไข: เรียกใช้ CheckoutView ที่เราปรับปรุง Indicator ไว้
      case "checkout":
        return (
          <CheckoutView
            customerInfo={customerInfo}
            setCustomerInfo={setCustomerInfo}
            onNext={() => setStep("payment")}
            isValid={
              customerInfo.name && customerInfo.address && customerInfo.phone
            }
          />
        );

      // แก้ไข: เรียกใช้ PaymentView ที่เราเพิ่มระบบ QR Code ไว้
      case "payment":
        return (
          <PaymentView
            totalPrice={totalPrice}
            paymentSlip={paymentSlip}
            setPaymentSlip={setPaymentSlip}
            onConfirm={handleConfirmPayment}
            isLoading={isLoading}
          />
        );

      case "verifying":
        return <VerifyingView />;

      // แก้ไข: เรียกใช้ SuccessView เพื่อแสดงใบเสร็จที่สวยงาม
      case "success":
        return (
          <SuccessView
            orderId={orderId}
            orderTime={orderTime}
            customerInfo={customerInfo}
            cart={cart}
            totalPrice={totalPrice}
            onPrint={() => window.print()}
            onReset={resetOrder}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="font-sans text-gray-800 antialiased bg-[#FDFBF7] min-h-screen overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Thai:wght@400;700&family=Sarabun:wght@300;400;500;700&display=swap');
        body { font-family: 'Sarabun', sans-serif; }
        h1, h2, h3, h4, .font-serif { font-family: 'Noto Serif Thai', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        
        @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        
        @keyframes fall {
          0% { transform: translateY(-15vh) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(115vh) rotate(360deg); opacity: 0; }
        }
        
        @media print { .no-print { display: none !important; } }
      `}</style>

      {step !== "home" && step !== "success" && (
        <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-xl z-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center no-print">
          <div
            className="font-serif text-[#5D6D4E] text-2xl font-bold cursor-pointer"
            onClick={() => setStep("home")}
          >
            Flower For You 24
          </div>
          <button
            onClick={() => setStep("cart")}
            className="relative p-3 bg-gray-50 rounded-2xl text-gray-600 hover:text-[#8A9A7B] transition-all"
          >
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#8A9A7B] text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm">
                {cart.length}
              </span>
            )}
          </button>
        </nav>
      )}

      <main
        className={step !== "home" && step !== "success" ? "pt-24 pb-12" : ""}
      >
        {renderContent()}
      </main>

      <ImageModal
        src={activePreviewImage}
        onClose={() => setActivePreviewImage(null)}
      />
    </div>
  );
};

export default App;
