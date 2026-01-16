const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit"); // 1. นำเข้า Rate Limit
// --- ดึงค่าจาก Environment Variable ที่ส่งมาจาก Docker ---
// ถ้าไม่มีให้ใช้ค่า Default สำหรับรันเครื่องตัวเอง (localhost)
const mongoURI =
  process.env.MONGO_URI || "mongodb://localhost:27017/flower_shop";
const PORT = process.env.PORT || 5000;

const app = express();
app.set("trust proxy", 1);
// --- Middleware ---
app.use(cors());
app.use(express.json());
// ปรับให้รองรับ path ใน container

// Middleware สำหรับตรวจสอบสิทธิ์ Admin
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const adminAuth = (req, res, next) => {
  const adminKey = req.headers["x-admin-key"]; // อ่านค่าจาก Header ชื่อ x-admin-key
  const SECRET_ADMIN_KEY = "fl0w3rf0ry0ufl0w3rf0ry0u"; // ในอนาคตควรใช้ process.env.ADMIN_KEY

  if (adminKey === SECRET_ADMIN_KEY) {
    next(); // รหัสถูกต้อง ให้ไปต่อ
  } else {
    res
      .status(401)
      .json({ message: "Unauthorized: สิทธิ์เข้าถึงเฉพาะผู้ดูแลระบบเท่านั้น" });
  }
};
// --- 1. เชื่อมต่อ MongoDB ---
mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ Could not connect to MongoDB");
    console.error("Target URI:", mongoURI);
    console.error(err);
  });

// --- 2. Schema และ Model ---
const orderSchema = new mongoose.Schema({
  orderId: String,
  orderTime: Date,
  customerInfo: Object,
  items: Array,
  summary: Object,
  slipPath: String,
  status: { type: String, default: "pending" },
});

const Order = mongoose.model("Order", orderSchema);

// --- 3. ตั้งค่า Nodemailer ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "flowerforyoushop.s@gmail.com",
    pass: "ttof dhtq bhwi redx", // แนะนำให้ใช้ process.env.EMAIL_PASS ในอนาคต
  },
});
const notifyShopNewOrder = async (orderData) => {
  const mailOptions = {
    from: '"System Alert" <flowerforyoushop.s@gmail.com>',
    to: "flowerforyoushop.s@gmail.com", // อีเมลร้านค้า
    subject: `🔔 มีออเดอร์ใหม่เข้า! (#${orderData.orderId})`,
    html: `
      <div style="font-family: sans-serif; border: 1px solid #5D6D4E; padding: 20px; border-radius: 10px;">
        <h2 style="color: #5D6D4E; border-bottom: 2px solid #5D6D4E; padding-bottom: 10px;">🌸 มีออเดอร์ใหม่เข้ามาค่ะ!</h2>
        <p><strong>เลขที่ออเดอร์:</strong> ${orderData.orderId}</p>
        <p><strong>วันที่สั่ง:</strong> ${new Date(
          orderData.orderTime
        ).toLocaleString("th-TH")}</p>
        <p><strong>ลูกค้า:</strong> คุณ ${orderData.customerInfo.name}</p>
        <p><strong>เบอร์โทร:</strong> ${orderData.customerInfo.phone}</p>
        <p><strong>ยอดชำระรวม:</strong> ฿${orderData.summary.totalPrice.toLocaleString()}</p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 13px;">กรุณาเข้าตรวจสอบหลักฐานการโอนเงินที่ระบบหลังบ้าน</p>
      </div>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log("📢 Shop notification sent!");
  } catch (error) {
    console.error("❌ Shop notification failed:", error);
  }
};

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // จำกัด 5 ครั้งต่อ IP
  message: {
    message: "คุณทำรายการบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่นะคะ",
  },
  standardHeaders: true, // ส่งค่า RateLimit-Limit ใน header
  legacyHeaders: false, // ปิด Header รุ่นเก่า (X-RateLimit)
});

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ฟังก์ชันสำหรับส่งอีเมล
const sendOrderStatusEmail = async (orderData, status) => {
  const isApproved = status === "approved";
  const shippingCost = 50;

  const mailOptions = {
    from: '"Flower For You 24" <flowerforyoushop.s@gmail.com>',
    to: orderData.customerInfo.email,
    subject: isApproved
      ? `Your flowers are coming! Order #${orderData.orderId}`
      : `Action Required: Order #${orderData.orderId} Payment Issue`,
    html: `
  <div style="font-family: 'Sarabun', Helvetica, Arial, sans-serif; line-height: 1.5; color: #444; max-width: 480px; margin: auto; border: 1px solid #f0f0f0; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
    
    <div style="background-color: ${
      isApproved ? "#5D6D4E" : "#d32f2f"
    }; padding: 30px 20px; text-align: center;">
      <h2 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px; font-weight: 600;">
        ${isApproved ? "ชำระเงินเรียบร้อยแล้วค่ะ ✨" : "พบปัญหาการชำระเงิน"}
      </h2>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;">
        หมายเลขคำสั่งซื้อ: ${orderData.orderId}
      </p>
    </div>

    <div style="padding: 24px; background-color: #ffffff;">
      <p style="margin: 0 0 12px; font-size: 16px; color: #333;">
        สวัสดีค่ะคุณ <strong>${orderData.customerInfo.name}</strong> 🌸
      </p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #666; line-height: 1.6;">
        ${
          isApproved
            ? "ได้รับยอดชำระเรียบร้อยแล้วนะคะ ตอนนี้ทางร้านกำลังจัดเตรียมดอกไม้สวยๆ ให้อย่างสุดฝีมือเลยค่ะ เพื่อให้มั่นใจว่าดอกไม้จะไปถึงมือคุณในสภาพที่สมบูรณ์ที่สุด"
            : "ขออภัยด้วยนะคะ ทางร้านไม่สามารถตรวจสอบยอดชำระจากสลิปที่ส่งมาได้ รบกวนคุณลูกค้าตรวจสอบรายละเอียดการโอนอีกครั้ง หรือทักแชทหาแอดมินเพื่อส่งหลักฐานใหม่ได้เลยนะคะ"
        }
      </p>

      <div style="background-color: #FBFBF9; border-radius: 16px; padding: 20px; border: 1px solid #F1F1EB;">
        <p style="margin: 0 0 15px; font-weight: bold; font-size: 12px; color: #8A9A7B; text-transform: uppercase; letter-spacing: 1px;">สรุปรายการสั่งซื้อ</p>
        
        <table style="width: 100%; border-collapse: collapse;">
          ${orderData.items
            .map(
              (item) => `
            <tr>
              <td style="padding-bottom: 12px; vertical-align: top;">
                <div style="font-weight: 600; color: #333; font-size: 14px;">${
                  item.name
                }</div>
              </td>
              <td style="padding-bottom: 12px; text-align: right; vertical-align: top; font-weight: 600; color: #444; font-size: 14px; white-space: nowrap;">
                ฿${item.price.toLocaleString()}
              </td>
            </tr>
          `
            )
            .join("")}

          <tr>
            <td style="padding: 8px 0; font-size: 13px; color: #666; border-top: 1px solid #EAEAE2;">ค่าจัดส่ง</td>
            <td style="padding: 8px 0; text-align: right; font-size: 13px; color: #666; border-top: 1px solid #EAEAE2;">฿${shippingCost}</td>
          </tr>

          <tr>
            <td style="padding-top: 12px; font-weight: bold; color: #333; font-size: 15px;">ยอดชำระรวม</td>
            <td style="padding-top: 12px; text-align: right; font-weight: 800; color: #5D6D4E; font-size: 18px;">
              ฿${orderData.summary.totalPrice.toLocaleString()}
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 35px; text-align: center; background: #F8F9F4; padding: 15px; border-radius: 12px;">
        <p style="margin: 0; font-size: 14px; color: #5D6D4E; font-style: italic;">
          "เพราะดอกไม้คือตัวแทนความรู้สึก... ให้เราช่วยดูแลคนพิเศษของคุณนะคะ"
        </p>
        <p style="margin: 8px 0 0; font-weight: bold; color: #5D6D4E; font-size: 15px;">ขอบคุณที่ใช้บริการ Flower For You 24 นะคะ 🤍</p>
      </div>

      <div style="margin-top: 25px; text-align: center; border-top: 1px solid #F3F4F6; padding-top: 20px;">
        <p style="margin: 0; font-weight: bold; color: #5D6D4E; font-size: 14px;">Flower For You 24</p>
        <p style="margin: 4px 0 0; font-size: 11px; color: #BBB;">บริการด้วยหัวใจ ตลอด 24 ชั่วโมง</p>
      </div>
    </div>
  </div>
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `📧 Final email sent (${status}) to: ${orderData.customerInfo.email}`
    );
  } catch (error) {
    console.error("❌ Send email failed:", error);
  }
};

// --- 4. Multer & Routes ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads/slips";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e3);
    cb(null, uniqueSuffix + ext);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัดไว้ที่ 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("รองรับเฉพาะไฟล์รูปภาพเท่านั้น!"), false);
    }
  },
});

app.post(
  "/api/orders",
  orderLimiter,
  (req, res, next) => {
    upload.single("slip")(req, res, (err) => {
      if (err) {
        // ดัก Error จาก Multer (ไฟล์ใหญ่เกิน หรือไม่ใช่รูป)
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      // 1. ป้องกันการ Crash จาก JSON.parse
      let orderData;
      try {
        orderData = JSON.parse(req.body.orderData);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        return res
          .status(400)
          .json({ message: "รูปแบบข้อมูล Order ไม่ถูกต้อง" });
      }

      // 2. ตรวจสอบข้อมูลที่จำเป็น (Basic Validation)
      if (!orderData || !orderData.orderId) {
        return res.status(400).json({ message: "ข้อมูล Order ไม่ครบถ้วน" });
      }

      // 3. สร้างและบันทึกข้อมูล
      const newOrder = new Order({
        ...orderData,
        slipPath: req.file ? req.file.path.replace(/\\/g, "/") : null,
      });

      await newOrder.save();

      // 4. แจ้งเตือนร้านค้า (Background Job - ไม่ต้อง await เพื่อให้ลูกค้าได้รับคำตอบเร็วขึ้น)
      notifyShopNewOrder(newOrder).catch((err) =>
        console.error("Notify Shop Error:", err)
      );

      // 5. ตอบกลับลูกค้า
      res.status(201).json({
        message: "Order saved!",
        orderId: newOrder.orderId,
      });
    } catch (error) {
      // ดักจับ Error อื่นๆ เช่น MongoDB ต่อไม่ติด
      console.error("Save Order Error:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดภายในระบบ" });
    }
  }
);

// --- 5. API สำหรับ Tracking (ตรวจสอบสถานะคำสั่งซื้อ) ---
app.get("/api/orders/track/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(404).json({
        message: "ไม่พบหมายเลขคำสั่งซื้อนี้ กรุณาตรวจสอบใหม่อีกครั้ง",
      });
    }

    // จัดรูปแบบข้อมูลรายการดอกไม้ให้ดูง่าย
    const flowerList = order.items.map((item) => ({
      name: item.name,
      price: item.price,
      // ถ้ามีจำนวน (quantity) ในข้อมูลให้เพิ่มตรงนี้ด้วย
    }));

    res.json({
      orderId: order.orderId,
      status: order.status,
      customerName: order.customerInfo.name,
      orderTime: order.orderTime,
      flowers: flowerList, // รายการดอกไม้ที่สั่ง
      summary: {
        totalPrice: order.summary.totalPrice,
        shippingCost: 50, // ค่าส่งที่ตั้งไว้
      },
    });
  } catch (error) {
    console.error("Tracking Error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
  }
});

app.get("/api/orders", adminAuth, async (req, res) => {
  console.log("Client IP:", req.ip);
  try {
    const orders = await Order.find().sort({ orderTime: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders" });
  }
});

app.patch("/api/orders/:id/status", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentOrder = await Order.findOne({ orderId: id });
    if (!currentOrder)
      return res.status(404).json({ message: "Order not found" });
    if (currentOrder.status !== "pending")
      return res.status(400).json({ message: "Order already processed" });

    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: id },
      { status: status },
      { new: true }
    );
    if (updatedOrder) await sendOrderStatusEmail(updatedOrder, status);
    res.json({ message: `Status updated to ${status} and email sent.` });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
