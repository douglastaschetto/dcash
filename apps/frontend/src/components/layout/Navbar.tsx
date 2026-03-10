"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LucideMenu, LucideX, LucideLayoutDashboard, LucideCalendar, 
  LucideTarget, LucideCheckSquare, LucidePiggyBank, LucideAlertCircle, 
  LucideHistory, LucideTrophy, LucideHeart, LucideSparkles, LucideUser,
  LucideLogOut
} from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; avatar?: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // 1. CARREGAR DADOS DO USUÁRIO (LocalStorage)
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

  // 2. BLOQUEIO DE SCROLL NO MENU ABERTO
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
  }, [isOpen]);

  const pageTitles: { [key: string]: string } = {
    "/": "Dashboard",
    "/dashboard": "Dashboard",
    "/perfil": "Meu Perfil",
    "/calendar": "Contas",
    "/category-limits": "Limites",
    "/todos": "Tarefas",
    "/piggy-banks": "Cofrinhos",
    "/debts": "Dívidas",
    "/transactions": "Lançamentos",
    "/fixed-bills": "Contas Fixas",
    "/categories": "Categorias",
    "/payments": "Formas de Pagamento",
    "/challenges": "Desafios",
    "/wishlist": "Desejos",
    "/dreams": "Mural",
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LucideLayoutDashboard size={18} />, },
    { name: "Limites", path: "/category-limits", icon: <LucideTarget size={18} /> },
    { name: "Categorias", path: "/categories", icon: <LucideTarget size={18} /> },
    { name: "Formas Pagamento", path: "/payments", icon: <LucideTarget size={18} /> },
    { name: "Cofrinhos", path: "/piggy-banks", icon: <LucidePiggyBank size={18} /> },
    { name: "Desafios", path: "/challenges", icon: <LucideTrophy size={18} /> },
    { name: "Mural", path: "/dreams", icon: <LucideSparkles size={18} /> },
    { name: "Calendário", path: "/calendar", icon: <LucideCalendar size={18} /> },
    // { name: "Dívidas", path: "/debts", icon: <LucideAlertCircle size={18} /> },
    { name: "Lançamentos", path: "/transactions", icon: <LucideHistory size={18} /> },
    { name: "Desejos", path: "/wishlist", icon: <LucideHeart size={18} /> },
    { name: "Contas Fixas", path: "/fixed-bills", icon: <LucideHeart size={18} /> },
    { name: "Tarefas", path: "/todos", icon: <LucideCheckSquare size={18} /> },
  ];

  // 3. LOGOUT CUSTOMIZADO (Limpa storage e redireciona)
  const handleLogout = () => {
    localStorage.removeItem('@dcash:token');
    localStorage.removeItem('@dcash:user');
    setIsOpen(false);
    router.push('/login');
  };

  return (
    <>
      {/* --- BARRA SUPERIOR --- */}
      <nav className="h-[72px] w-full bg-zinc-950 border-b border-white/5 px-6 flex justify-between items-center sticky top-0 z-[200]">
        <div className="flex items-center gap-6">
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
          {/* BOTÃO DE PERFIL COM AVATAR DO STORAGE */}
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
            title="Sair do Sistema"
          >
            <LucideLogOut size={18} />
          </button>
        </div>
      </nav>

      {/* --- OVERLAY DO MENU --- */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#050505]/95 backdrop-blur-md z-[150] pt-[72px] animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-8 max-w-7xl mx-auto h-fit"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  router.push(item.path);
                  setIsOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border transition-all duration-300
                  ${pathname === item.path 
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]' 
                    : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-emerald-500/50 hover:text-white'}`}
              >
                <div className="mb-4 text-inherit">{item.icon}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-center">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}