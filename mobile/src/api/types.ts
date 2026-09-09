export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  gender: string;
  level: number;
  xp: number;
  isHost: boolean;
  createdAt: string;
}

export interface CurrentUser extends PublicUser {
  email: string;
  coins: number;
  diamonds: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
  followers?: number;
  following?: number;
}

export interface Room {
  id: string;
  title: string;
  coverUrl: string | null;
  category: string;
  status: 'live' | 'ended';
  channel: string;
  viewerCount: number;
  peakViewers: number;
  totalDiamonds: number;
  totalLikes: number;
  startedAt: string;
  endedAt: string | null;
  host: PublicUser;
}

export interface StreamCredentials {
  provider: string;
  channel: string;
  identity: string;
  role: 'host' | 'guest' | 'viewer';
  token: string;
  url?: string;
  expiresAt: number;
}

export interface Gift {
  id: string;
  code: string;
  name: string;
  emoji: string;
  priceCoins: number;
  tier: string;
  animation: string;
  isActive: boolean;
  /** Probabilidad de premio, de 0 a 1. En 0 el regalo nunca devuelve nada. */
  luckyChance: number;
  /** Multiplicadores posibles sobre lo gastado, separados por coma. */
  luckyMultipliers: string;
  /** Nivel de club de fans necesario. 0 lo puede enviar cualquiera. */
  minFanLevel: number;
  /** Nombre de la ilustración empaquetada, si la tiene; si no, se usa el emoji. */
  image: string | null;
}

export interface Wallet {
  coins: number;
  diamonds: number;
}

export interface CoinPackage {
  id: string;
  coins: number;
  priceUsd: number;
  bonus: number;
}

export interface RankingEntry {
  rank: number;
  score: number;
  user: PublicUser;
}

export interface Transaction {
  id: string;
  type: string;
  currency: string;
  amount: number;
  balanceAfter: number;
  reference: string | null;
  createdAt: string;
}

export interface PastStream {
  id: string;
  title: string;
  category: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  peakViewers: number;
  totalDiamonds: number;
  totalLikes: number;
}

export interface Profile {
  user: PublicUser;
  stats: { followers: number; following: number };
  isFollowing: boolean;
  isSelf: boolean;
  liveRoom: { id: string; title: string; viewerCount: number } | null;
}

/** Un escalón de la tabla de salarios de los anfitriones. */
export interface SalaryLevel {
  nivel: number;
  /** Monedas de regalos de la suerte que hay que reunir en el día. */
  meta: number;
  /** Diamantes que se pagan al alcanzarla. */
  salario: number;
}

export interface SalaryProgress {
  /** Día del calendario en la zona del corte, como YYYY-MM-DD. */
  dia: string;
  /** Monedas gastadas por los espectadores en regalos de la suerte. */
  luckyCoins: number;
  liveSeconds: number;
  /** Sin las horas mínimas no se cobra, por muchas monedas que se reúnan. */
  cumpleHoras: boolean;
  segundosMinimos: number;
  nivel: number;
  /** Lo que se cobraría si el día terminase ahora. */
  salarioEstimado: number;
  siguiente: SalaryLevel | null;
  niveles: SalaryLevel[];
}

/**
 * Lo que necesita la barra de meta que se ve durante el directo. Es el mismo
 * contenido que llega por `room:goal`, sin la tabla de niveles, que no cambia.
 */
export interface RoomGoal {
  luckyCoins: number;
  nivel: number;
  siguiente: SalaryLevel | null;
  liveSeconds: number;
  segundosMinimos: number;
  cumpleHoras: boolean;
}

export interface SalaryPayment {
  id: string;
  day: string;
  level: number;
  luckyCoins: number;
  liveSeconds: number;
  diamonds: number;
  paidAt: string;
}

/** Un cofre del juego de azar, con lo que cuesta y lo que puede tocar. */

/**
 * Cómo va de dinero la plataforma. Solo la ve la cuenta de pruebas.
 *
 * La cuenta es `caja − deuda`: entra dinero por las recargas y se debe todo
 * diamante guardado, que es lo único convertible en dinero. Las monedas no son
 * deuda, solo saldo de juego.
 */
export interface PlatformStats {
  caja: { dolares: number; recargas: number; monedasCompradas: number };
  deuda: { diamantes: number; dolares: number };
  posicion: { dolares: number; respaldo: number | null };
  monedas: {
    enCirculacion: number;
    compradas: number;
    dePremio: number;
    deCambio: number;
    deRegalo: number;
    dolaresEquivalentes: number;
  };
  diamantes: {
    enCirculacion: number;
    porSuerte: number;
    porExclusivos: number;
    porSalario: number;
    cambiados: number;
  };
  volumen: { enSuerte: number; enExclusivos: number };
  /** En cuánto se pueden convertir las monedas de hoy. Deuda que aún no nació. */
  exposicion: {
    monedas: number;
    siExclusivos: number;
    siCofres: number;
    siSuerte: number;
    retorno: number;
  };
  /** Salarios del día, sumando el nivel de cada anfitrión por separado. */
  metas: {
    dia: string;
    anfitriones: number;
    conMeta: number;
    aPagar: number;
    sinHoras: number;
    monedas: number;
  };
  gente: { cuentas: number; mayores: { displayName: string; username: string; diamonds: number }[] };
}

/** Una cuenta cuyo saldo no cuadra con la suma de sus movimientos. */
export interface AuditedAccount {
  id: string;
  username: string;
  displayName: string;
  isBanned: boolean;
  coins: number;
  monedasEsperadas: number;
  /** Positivo: tiene monedas que no salieron de ninguna parte. */
  descuadreMonedas: number;
  diamonds: number;
  diamantesEsperados: number;
  descuadreDiamantes: number;
}

/** Si el juego está pagando lo que debería. */
export interface GameCheck {
  code: string;
  titulo: string;
  nivel: 'ok' | 'aviso' | 'alarma';
  real: number;
  previsto: number;
  envios: number;
  detalle: string;
}

export interface AuditReport {
  revisadas: number;
  sospechosas: AuditedAccount[];
  juego: GameCheck[];
}
