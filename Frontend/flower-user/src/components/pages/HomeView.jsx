import { Plus } from "lucide-react";
import FallingBackground from "../shared/FallingBackground";

const HomeView = ({ onStartCustom, onGoCatalog }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-4 text-center relative overflow-hidden">
    <FallingBackground />

    <div className="mb-12 animate-fade-in text-[#5D6D4E] z-10 relative">
      <h1 className="text-6xl md:text-8xl font-serif mb-6 tracking-wide drop-shadow-md">
        Flower For You 24
      </h1>
      <p className="text-xl md:text-2xl font-light italic opacity-80 tracking-widest text-[#99908c] ">
        ลูกปัดดอกไม้แฮนด์เมดด้วยหัวใจ
      </p>
    </div>

    <div className="flex flex-col sm:flex-row gap-6 z-10 relative">
      <button
        onClick={onStartCustom}
        className="px-12 py-6 bg-[#8A9A7B] text-white rounded-full hover:bg-[#6D7D5E] transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 font-bold active:scale-95 text-xl"
      >
        <Plus size={24} /> ออกแบบเอง (Custom)
      </button>
      <button
        onClick={onGoCatalog}
        className="px-12 py-6 border-2 border-[#8A9A7B] text-[#8A9A7B] rounded-full hover:bg-[#8A9A7B] hover:text-white transition-all shadow-lg hover:shadow-xl font-bold flex items-center justify-center active:scale-95 text-xl bg-white/40 backdrop-blur-sm"
      >
        เลือกชุดที่มีอยู่แล้ว
      </button>
    </div>

    {/* Subtle blobs for depth */}
    <div className="absolute top-[-5%] left-[-10%] w-[40vw] h-[40vw] bg-[#E9EDC9] rounded-full blur-[120px] opacity-20"></div>
    <div className="absolute bottom-[-5%] right-[-10%] w-[50vw] h-[50vw] bg-[#CCD5AE] rounded-full blur-[140px] opacity-20"></div>
  </div>
);

export default HomeView;
