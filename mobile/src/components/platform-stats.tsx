import { StyleSheet, Text, View } from 'react-native';
import type { PlatformStats } from '../api/types';
import { colors, formatCount, radius, spacing, typography } from '../theme';

/**
 * Cómo va de dinero la aplicación, en el perfil de la cuenta de pruebas.
 *
 * Arriba va la única cifra que decide: **lo que entró menos lo que se debe**.
 * Entra dinero por las recargas y se debe todo diamante guardado, porque es lo
 * único que se convierte en dinero. Las monedas no aparecen en esa resta: no se
 * pueden retirar, así que una cuenta con millones de monedas no debe nada.
 *
 * Debajo va de dónde sale cada cosa, que es lo que permite entender un número
 * malo en vez de solo verlo: los exclusivos dejan el 70% en diamantes contra el
 * 5% de los de la suerte, y las monedas de premio o de bienvenida generan
 * diamantes igual que las compradas pero sin ningún dólar detrás.
 */
export function PlatformStatsCard({ stats }: { stats: PlatformStats }) {
  const positivo = stats.posicion.dolares >= 0;

  return (
    <View style={styles.tarjeta}>
      <Text style={typography.label}>Estadísticas de la plataforma</Text>

      <View style={[styles.posicion, positivo ? styles.posicionBuena : styles.posicionMala]}>
        <Text style={styles.posicionEtiqueta}>{positivo ? 'A favor' : 'En pérdida'}</Text>
        <Text style={[styles.posicionCifra, { color: positivo ? colors.success : colors.danger }]}>
          {dolares(stats.posicion.dolares)}
        </Text>
        <Text style={styles.posicionDetalle}>
          {dolares(stats.caja.dolares)} de recargas − {dolares(stats.deuda.dolares)} por pagar
          {stats.posicion.respaldo !== null
            ? ` · cubierto ${(stats.posicion.respaldo * 100).toFixed(0)}%`
            : ''}
        </Text>
      </View>

      <View style={styles.fila}>
        <Dato titulo="Entró" valor={dolares(stats.caja.dolares)} pie={`${stats.caja.recargas} recargas`} />
        <Dato
          titulo="Se debe"
          valor={dolares(stats.deuda.dolares)}
          pie={`💎 ${formatCount(stats.deuda.diamantes)} guardados`}
          color={colors.diamond}
        />
      </View>

      <Text style={styles.seccion}>De dónde salen los diamantes</Text>
      <Linea etiqueta="Regalos de la suerte y cofres (5%)" valor={stats.diamantes.porSuerte} />
      <Linea etiqueta="Exclusivos (70%)" valor={stats.diamantes.porExclusivos} />
      <Linea etiqueta="Salario de anfitriones" valor={stats.diamantes.porSalario} />
      <Linea etiqueta="Ya cambiados a monedas" valor={-stats.diamantes.cambiados} />

      <Text style={styles.seccion}>Monedas en circulación</Text>
      <Linea etiqueta="Compradas con dinero" valor={stats.monedas.compradas} moneda />
      <Linea etiqueta="Ganadas en premios" valor={stats.monedas.dePremio} moneda aviso />
      <Linea etiqueta="De bienvenida" valor={stats.monedas.deRegalo} moneda aviso />
      <Linea etiqueta="Cambiadas desde diamantes" valor={stats.monedas.deCambio} moneda />
      <Text style={styles.nota}>
        Las marcadas no las pagó nadie, y aun así generan diamantes igual que las compradas: si la
        deuda crece más rápido que las recargas, sale de ahí.
      </Text>

      <Text style={styles.seccion}>Volumen movido en regalos</Text>
      <Linea etiqueta="De la suerte (cuenta para las metas)" valor={stats.volumen.enSuerte} moneda />
      <Linea etiqueta="Exclusivos" valor={stats.volumen.enExclusivos} moneda />

      {stats.gente.mayores.length > 0 ? (
        <>
          <Text style={styles.seccion}>Quién tiene más diamantes</Text>
          {stats.gente.mayores.map((persona) => (
            <View key={persona.username} style={styles.linea}>
              <Text style={styles.lineaEtiqueta} numberOfLines={1}>
                {persona.displayName}
              </Text>
              <Text style={[styles.lineaValor, { color: colors.diamond }]}>
                💎 {formatCount(persona.diamonds)}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.nota}>
        {stats.gente.cuentas} cuentas registradas. Las recargas todavía son simuladas, así que «lo
        que entró» es lo que habría entrado con esos paquetes.
      </Text>
    </View>
  );
}

function Dato({
  titulo,
  valor,
  pie,
  color,
}: {
  titulo: string;
  valor: string;
  pie: string;
  color?: string;
}) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoTitulo}>{titulo}</Text>
      <Text style={[styles.datoValor, color ? { color } : null]}>{valor}</Text>
      <Text style={styles.datoPie}>{pie}</Text>
    </View>
  );
}

function Linea({
  etiqueta,
  valor,
  moneda,
  aviso,
}: {
  etiqueta: string;
  valor: number;
  moneda?: boolean;
  aviso?: boolean;
}) {
  return (
    <View style={styles.linea}>
      <Text style={[styles.lineaEtiqueta, aviso && styles.lineaAviso]} numberOfLines={1}>
        {aviso ? '⚠ ' : ''}
        {etiqueta}
      </Text>
      <Text style={[styles.lineaValor, { color: moneda ? colors.coin : colors.diamond }]}>
        {moneda ? '🪙' : '💎'} {formatCount(Math.abs(valor))}
      </Text>
    </View>
  );
}

/** Con céntimos: en pruebas las cifras son pequeñas y sin ellos todo sale «$0». */
function dolares(valor: number): string {
  const signo = valor < 0 ? '−' : '';
  return `${signo}$${Math.abs(valor).toFixed(2)}`;
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  posicion: { borderRadius: radius.md, borderWidth: 2, padding: spacing.md, gap: 2 },
  posicionBuena: { borderColor: colors.success, backgroundColor: 'rgba(56,239,125,0.10)' },
  posicionMala: { borderColor: colors.danger, backgroundColor: 'rgba(255,77,94,0.10)' },
  posicionEtiqueta: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  posicionCifra: { fontSize: 30, fontWeight: '900' },
  posicionDetalle: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  fila: { flexDirection: 'row', gap: spacing.sm },
  dato: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, gap: 1 },
  datoTitulo: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  datoValor: { color: colors.text, fontSize: 18, fontWeight: '900' },
  datoPie: { color: colors.textFaint, fontSize: 10, fontWeight: '600' },

  seccion: { color: colors.textMuted, fontSize: 11, fontWeight: '800', marginTop: spacing.sm },
  linea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  lineaEtiqueta: { color: colors.text, fontSize: 12, flexShrink: 1 },
  lineaAviso: { color: colors.accent },
  lineaValor: { fontSize: 12, fontWeight: '800' },

  nota: { color: colors.textFaint, fontSize: 10, lineHeight: 15, marginTop: spacing.xs },
});
