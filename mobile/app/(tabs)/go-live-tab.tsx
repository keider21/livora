import { Redirect } from 'expo-router';

/**
 * El botón central de la barra abre la pantalla modal /go-live. Esta ruta existe
 * solo para reservarle el hueco en la barra de pestañas.
 */
export default function GoLiveTabPlaceholder() {
  return <Redirect href="/go-live" />;
}
