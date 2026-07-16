/**
 * Catálogo de ícones Lucide por categoria financeira.
 * Cada entrada é o nome exato do componente exportado pelo lucide-react.
 */

export type IconCatalogEntry = {
  name: string;   // nome do componente Lucide (ex: "ShoppingCart")
  label: string;  // rótulo exibido ao usuário
};

export type IconCatalogSection = {
  section: string;
  icons: IconCatalogEntry[];
};

export const ICON_CATALOG: IconCatalogSection[] = [
  {
    section: 'Receitas & Trabalho',
    icons: [
      { name: 'Wallet', label: 'Carteira' },
      { name: 'Banknote', label: 'Cédula' },
      { name: 'CreditCard', label: 'Cartão' },
      { name: 'TrendingUp', label: 'Crescimento' },
      { name: 'Landmark', label: 'Banco' },
      { name: 'Briefcase', label: 'Trabalho' },
      { name: 'BadgeDollarSign', label: 'Renda' },
      { name: 'HandCoins', label: 'Pagamento' },
      { name: 'DollarSign', label: 'Dólar' },
      { name: 'CircleDollarSign', label: 'Moeda' },
      { name: 'Trophy', label: 'Prêmio' },
      { name: 'Award', label: 'Conquista' },
      { name: 'Star', label: 'Destaque' },
      { name: 'Gift', label: 'Presente' },
      { name: 'Handshake', label: 'Parceria' },
      { name: 'Building2', label: 'Empresa' },
      { name: 'Users', label: 'Equipe' },
      { name: 'Laptop', label: 'Freelance' },
      { name: 'Smartphone', label: 'Venda Digital' },
      { name: 'Store', label: 'Loja' },
    ],
  },
  {
    section: 'Alimentação',
    icons: [
      { name: 'UtensilsCrossed', label: 'Alimentação' },
      { name: 'Coffee', label: 'Café' },
      { name: 'Pizza', label: 'Pizza' },
      { name: 'Sandwich', label: 'Lanche' },
      { name: 'Apple', label: 'Fruta' },
      { name: 'ShoppingBasket', label: 'Mercado' },
      { name: 'ShoppingCart', label: 'Compras' },
      { name: 'ChefHat', label: 'Restaurante' },
      { name: 'Soup', label: 'Refeição' },
      { name: 'Beef', label: 'Churrasco' },
      { name: 'Wine', label: 'Bebida' },
      { name: 'GlassWater', label: 'Hidratação' },
    ],
  },
  {
    section: 'Transporte',
    icons: [
      { name: 'Car', label: 'Carro' },
      { name: 'Bus', label: 'Ônibus' },
      { name: 'Train', label: 'Trem / Metrô' },
      { name: 'Plane', label: 'Avião' },
      { name: 'Bike', label: 'Bicicleta' },
      { name: 'Fuel', label: 'Combustível' },
      { name: 'ParkingCircle', label: 'Estacionamento' },
      { name: 'Truck', label: 'Frete' },
      { name: 'Ship', label: 'Embarque' },
      { name: 'Navigation', label: 'Trajeto' },
    ],
  },
  {
    section: 'Moradia & Contas',
    icons: [
      { name: 'Home', label: 'Casa' },
      { name: 'Building', label: 'Apartamento' },
      { name: 'Plug', label: 'Energia' },
      { name: 'Droplets', label: 'Água' },
      { name: 'Flame', label: 'Gás' },
      { name: 'Wifi', label: 'Internet' },
      { name: 'Phone', label: 'Telefone' },
      { name: 'Tv', label: 'Streaming' },
      { name: 'Wrench', label: 'Manutenção' },
      { name: 'Hammer', label: 'Reforma' },
      { name: 'Key', label: 'Aluguel' },
      { name: 'Thermometer', label: 'Ar Condicionado' },
    ],
  },
  {
    section: 'Saúde & Bem-estar',
    icons: [
      { name: 'HeartPulse', label: 'Saúde' },
      { name: 'Stethoscope', label: 'Médico' },
      { name: 'Pill', label: 'Remédio' },
      { name: 'Hospital', label: 'Hospital' },
      { name: 'Dumbbell', label: 'Academia' },
      { name: 'Activity', label: 'Atividade' },
      { name: 'Eye', label: 'Óptica' },
      { name: 'SmilePlus', label: 'Dentista' },
      { name: 'Leaf', label: 'Bem-estar' },
      { name: 'Brain', label: 'Saúde Mental' },
      { name: 'Baby', label: 'Pediatria' },
    ],
  },
  {
    section: 'Educação',
    icons: [
      { name: 'GraduationCap', label: 'Faculdade' },
      { name: 'BookOpen', label: 'Livros' },
      { name: 'School', label: 'Escola' },
      { name: 'Library', label: 'Biblioteca' },
      { name: 'PenTool', label: 'Curso' },
      { name: 'Monitor', label: 'EAD' },
      { name: 'FlaskConical', label: 'Laboratório' },
      { name: 'Calculator', label: 'Estudo' },
      { name: 'Languages', label: 'Idiomas' },
    ],
  },
  {
    section: 'Lazer & Entretenimento',
    icons: [
      { name: 'Gamepad2', label: 'Games' },
      { name: 'Clapperboard', label: 'Cinema' },
      { name: 'Music', label: 'Música' },
      { name: 'Camera', label: 'Fotografia' },
      { name: 'Ticket', label: 'Eventos' },
      { name: 'Book', label: 'Leitura' },
      { name: 'Palette', label: 'Arte' },
      { name: 'Tent', label: 'Camping' },
      { name: 'Umbrella', label: 'Praia' },
      { name: 'Tv2', label: 'Séries' },
      { name: 'Headphones', label: 'Podcast' },
      { name: 'Dice5', label: 'Hobby' },
    ],
  },
  {
    section: 'Vestuário & Beleza',
    icons: [
      { name: 'Shirt', label: 'Roupas' },
      { name: 'Scissors', label: 'Cabelo' },
      { name: 'Sparkles', label: 'Beleza' },
      { name: 'Watch', label: 'Acessórios' },
      { name: 'Glasses', label: 'Óculos' },
      { name: 'Footprints', label: 'Calçados' },
      { name: 'ShoppingBag', label: 'Shopping' },
    ],
  },
  {
    section: 'Pets',
    icons: [
      { name: 'PawPrint', label: 'Pet' },
      { name: 'Fish', label: 'Aquário' },
      { name: 'Bird', label: 'Pássaro' },
      { name: 'Rabbit', label: 'Coelho' },
      { name: 'Bone', label: 'Veterinário' },
    ],
  },
  {
    section: 'Reservas & Investimentos',
    icons: [
      { name: 'PiggyBank', label: 'Poupança' },
      { name: 'TrendingUp', label: 'Investimento' },
      { name: 'BarChart2', label: 'Carteira' },
      { name: 'Shield', label: 'Reserva' },
      { name: 'Lock', label: 'Segurança' },
      { name: 'Vault', label: 'Cofre' },
      { name: 'LineChart', label: 'Renda Fixa' },
      { name: 'Bitcoin', label: 'Cripto' },
      { name: 'Coins', label: 'Moedas' },
      { name: 'Target', label: 'Meta' },
      { name: 'Gem', label: 'Premium' },
      { name: 'Archive', label: 'Fundo' },
    ],
  },
  {
    section: 'Finanças & Seguros',
    icons: [
      { name: 'Receipt', label: 'Fatura' },
      { name: 'FileText', label: 'Contrato' },
      { name: 'CreditCard', label: 'Crédito' },
      { name: 'HandCoins', label: 'Empréstimo' },
      { name: 'ShieldCheck', label: 'Seguro' },
      { name: 'ClipboardList', label: 'Orçamento' },
      { name: 'ArrowLeftRight', label: 'Transferência' },
      { name: 'Percent', label: 'Juros' },
      { name: 'Calculator', label: 'Cálculo' },
    ],
  },
  {
    section: 'Tecnologia',
    icons: [
      { name: 'Cpu', label: 'Hardware' },
      { name: 'HardDrive', label: 'Armazenamento' },
      { name: 'Cloud', label: 'Cloud' },
      { name: 'Server', label: 'Servidor' },
      { name: 'Bot', label: 'Automação' },
      { name: 'Code', label: 'Desenvolvimento' },
      { name: 'Printer', label: 'Impressora' },
      { name: 'Tablet', label: 'Tablet' },
    ],
  },
  {
    section: 'Outros',
    icons: [
      { name: 'Tag', label: 'Tag' },
      { name: 'Folder', label: 'Pasta' },
      { name: 'Star', label: 'Favorito' },
      { name: 'Bookmark', label: 'Marcador' },
      { name: 'Bell', label: 'Notificação' },
      { name: 'HelpCircle', label: 'Outros' },
      { name: 'MoreHorizontal', label: 'Diverso' },
      { name: 'Infinity', label: 'Geral' },
    ],
  },
];

// Lista plana para buscas
export const ALL_ICONS: IconCatalogEntry[] = ICON_CATALOG.flatMap((s) => s.icons);

// Deduplica por nome
export const UNIQUE_ICONS: IconCatalogEntry[] = Array.from(
  new Map(ALL_ICONS.map((i) => [i.name, i])).values(),
);
