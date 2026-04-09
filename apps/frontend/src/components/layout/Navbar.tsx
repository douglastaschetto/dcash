"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LucideMenu, LucideX, LucideLayoutDashboard, LucideCalendar, 
  LucideTarget, LucideCheckSquare, LucidePiggyBank, LucideAlertCircle, 
  LucideHistory, LucideTrophy, LucideHeart, LucideSparkles, LucideUser,
  LucideLogOut, LucideSettings
} from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; avatar?: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedUser = localStorage.getItem('@dcash:user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Erro ao carregar usuário do storage");
      }
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
  }, [isOpen]);

  const pageTitles: { [key: string]: string } = {
    "/": "Dashboard",
    "/dashboard": "Dashboard",
    "/perfil": "Meu Perfil",
    "/calendar": "Calendário",
    "/category-limits": "Limites",
    "/todos": "Tarefas",
    "/piggy-banks": "Cofrinhos",
    "/transactions": "Lançamentos",
    "/fixed-bills": "Contas Fixas",
    "/categories": "Categorias",
    "/payments": "Pagamentos",
    "/challenges": "Desafios",
    "/wishlist": "Desejos",
    "/dreams": "Mural",
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LucideLayoutDashboard size={20} />, },
    { name: "Limites", path: "/category-limits", icon: <LucideTarget size={20} /> },
    { name: "Categorias", path: "/categories", icon: <LucideSettings size={20} /> },
    { name: "Pagamentos", path: "/payments", icon: <LucideHistory size={20} /> },
    { name: "Cofrinhos", path: "/piggy-banks", icon: <LucidePiggyBank size={20} /> },
    { name: "Desafios", path: "/challenges", icon: <LucideTrophy size={20} /> },
    { name: "Mural", path: "/dreams", icon: <LucideSparkles size={20} /> },
    { name: "Calendário", path: "/calendar", icon: <LucideCalendar size={20} /> },
    { name: "Lançamentos", path: "/transactions", icon: <LucideHistory size={20} /> },
    { name: "Desejos", path: "/wishlist", icon: <LucideHeart size={20} /> },
    { name: "Contas Fixas", path: "/fixed-bills", icon: <LucideAlertCircle size={20} /> },
    { name: "Tarefas", path: "/todos", icon: <LucideCheckSquare size={20} /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('@dcash:token');
    localStorage.removeItem('@dcash:user');
    setIsOpen(false);
    router.push('/login');
  };

  return (
    <>
      <nav className="h-[72px] w-full bg-zinc-950 border-b border-white/5 px-6 flex justify-between items-center sticky top-0 z-[200]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white relative z-[210]"
          >
            {isOpen ? <LucideX size={24} /> : <LucideMenu size={24} />}
          </button>
          
          <div className="flex flex-col pointer-events-none">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 leading-none mb-1">DCASH</span>
            <h1 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">
              {pageTitles[pathname] || "Sistema"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsOpen(false); router.push('/perfil'); }}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-emerald-500/20 overflow-hidden flex items-center justify-center hover:border-emerald-500 transition-all shadow-lg"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <LucideUser className="text-emerald-500" size={18} />
            )}
          </button>

          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LucideLogOut size={18} />
          </button>
        </div>
      </nav>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[150] animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        >
          {/* ScrollView do Menu */}
          <div className="h-full w-full overflow-y-auto pt-[80px] pb-10 custom-scrollbar">
            <div 
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 p-6 max-w-6xl mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path);
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center aspect-square sm:aspect-auto p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border transition-all duration-300
                    ${pathname === item.path 
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] scale-[1.02]' 
                      : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:border-emerald-500/50 hover:text-white hover:bg-zinc-900'}`}
                >
                  <div className="mb-2 sm:mb-4 text-inherit">{item.icon}</div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}