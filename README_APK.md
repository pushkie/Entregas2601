
# Guía para Generar el APK de Entregas2601

Esta aplicación utiliza **Capacitor** para convertir el código React en una App nativa. Sigue estos pasos para obtener tu archivo `.apk`.

## Requisitos Previos
1. **Node.js** instalado.
2. **Android Studio** instalado y configurado con el SDK de Android.

## Pasos para la Conversión

### 1. Preparar el entorno (Solo la primera vez)
Si no ves una carpeta llamada `android` en el proyecto, ejecuta:
```bash
npm run build
npx cap add android
```

### 2. Sincronizar cambios
Cada vez que hagas cambios en el código de React y quieras verlos en la App:
```bash
npm run android:sync
```
*Este comando compila la web y copia los archivos a la carpeta de Android.*

### 3. Abrir en Android Studio
Para generar el archivo ejecutable:
```bash
npm run android:open
```

### 4. Generar el APK en Android Studio
Una vez que Android Studio abra el proyecto:
1. Espera a que termine la indexación (barra de progreso abajo).
2. Ve al menú superior: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Al finalizar, aparecerá una notificación abajo a la derecha. Haz clic en **"locate"** para ver tu archivo `app-debug.apk`.

## Recomendaciones para Producción
Para publicar la app de forma oficial:
- Cambia el icono en `android/app/src/main/res`.
- Usa **Build** > **Generate Signed Bundle / APK** para crear una versión firmada (release).
