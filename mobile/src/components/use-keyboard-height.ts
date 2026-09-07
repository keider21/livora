import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Alto del teclado cuando está abierto, 0 cuando no.
 *
 * `KeyboardAvoidingView` no basta en Android: con el modo a pantalla completa
 * que trae Expo por defecto, la ventana no se redimensiona y el teclado acaba
 * tapando el chat y la caja de escribir. Con el alto real se puede desplazar la
 * barra a mano y ver lo que se escribe.
 *
 * En Android los eventos son `keyboardDidShow`/`Hide`, que llegan cuando el
 * teclado ya está; en iOS se usan los `Will`, que llegan antes y permiten
 * acompañar la animación.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const mostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const ocultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const abierto = Keyboard.addListener(mostrar, (event) => setHeight(event.endCoordinates.height));
    const cerrado = Keyboard.addListener(ocultar, () => setHeight(0));

    return () => {
      abierto.remove();
      cerrado.remove();
    };
  }, []);

  return height;
}
