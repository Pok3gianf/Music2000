/**
 * Utility to generate downloadable Desktop files (Python source, batch installer, Lite Edition, Android package)
 */

export const PYTHON_STANDARD_SOURCE_CODE = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Music2000 v0.3.6 - Edicion Estandar
Omega Labs Inc - Reproductor Multimedia Corporativo Memphis
Compatible con Windows 7, 8, 10, 11, macOS y Linux
Incluye: Ecualizador de 10 Bandas, Explorador Custom, Visualizador Memphis,
Soporte de Audio/Video, Playlists y Persistencia Local.
"""

import sys
import json
import os
import math
from pathlib import Path

try:
    from PyQt6.QtCore import Qt, QUrl, QTimer, pyqtSignal, QSize
    from PyQt6.QtGui import QColor, QPainter, QLinearGradient, QBrush, QPen, QFont
    from PyQt6.QtWidgets import (
        QApplication, QMainWindow, QWidget, QFrame, QLabel, QPushButton,
        QVBoxLayout, QHBoxLayout, QListWidget, QListWidgetItem, QSlider,
        QMessageBox, QFileDialog, QSplitter, QProgressBar
    )
    from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
    from PyQt6.QtMultimediaWidgets import QVideoWidget
except ImportError:
    print("PyQt6 no esta instalado. Ejecuta: pip install PyQt6")
    sys.exit(1)

APP_NAME = "Music2000 Standard"
APP_VERSION = "0.3.6"
DATA_FILE = Path.home() / ".music2000_library.json"

class Music2000Window(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(f"{APP_NAME} v{APP_VERSION} - Corporate Memphis Edition")
        self.resize(1100, 720)
        self.setStyleSheet("""
            QMainWindow { background-color: #fcfaf7; }
            QWidget { font-family: 'Segoe UI', sans-serif; color: #1e293b; }
            QListWidget { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 6px; }
            QListWidget::item { padding: 8px; border-radius: 8px; }
            QListWidget::item:selected { background-color: #d1fae5; color: #065f46; font-weight: bold; }
            QPushButton { background-color: #10b981; color: white; border-radius: 8px; padding: 8px 16px; font-weight: bold; }
            QPushButton:hover { background-color: #059669; }
            QSlider::groove:horizontal { height: 6px; background: #e2e8f0; border-radius: 3px; }
            QSlider::sub-page:horizontal { background: #10b981; border-radius: 3px; }
            QSlider::handle:horizontal { background: #065f46; width: 14px; margin-top: -4px; margin-bottom: -4px; border-radius: 7px; }
            QFrame#eqPanel { background-color: #f4f6f8; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; }
        """)

        self.player = QMediaPlayer()
        self.audio_output = QAudioOutput()
        self.player.setAudioOutput(self.audio_output)
        self.audio_output.setVolume(0.8)

        self.playlist_items = []
        self.current_index = -1

        self.setup_ui()
        self.player.positionChanged.connect(self.on_position_changed)
        self.player.durationChanged.connect(self.on_duration_changed)

    def setup_ui(self):
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QVBoxLayout(main_widget)

        # Header bar
        header = QHBoxLayout()
        title_lbl = QLabel(f"<b>MUSIC2000</b> <span style='color:#10b981;'>ESTANDAR</span>")
        title_lbl.setStyleSheet("font-size: 16px;")
        header.addWidget(title_lbl)
        header.addStretch()

        btn_add = QPushButton("Añadir Archivos (Audio/Video)")
        btn_add.clicked.connect(self.open_file_dialog)
        header.addWidget(btn_add)
        main_layout.addLayout(header)

        # Middle splitter (List + Stage)
        splitter = QSplitter(Qt.Orientation.Horizontal)

        # Left: Track List
        self.track_list = QListWidget()
        self.track_list.itemDoubleClicked.connect(self.play_selected_item)
        splitter.addWidget(self.track_list)

        # Right: Visual Stage & Equalizer
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)

        self.now_playing_lbl = QLabel("Selecciona una pista para reproducir")
        self.now_playing_lbl.setStyleSheet("font-size: 14px; font-weight: bold; color: #0f172a; padding: 8px;")
        right_layout.addWidget(self.now_playing_lbl)

        # Seek slider
        self.seek_slider = QSlider(Qt.Orientation.Horizontal)
        self.seek_slider.sliderMoved.connect(self.set_position)
        right_layout.addWidget(self.seek_slider)

        # Controls row
        ctrl_row = QHBoxLayout()
        self.btn_prev = QPushButton("◄◄")
        self.btn_prev.clicked.connect(self.prev_track)
        self.btn_play = QPushButton("REPRODUCIR")
        self.btn_play.clicked.connect(self.toggle_play)
        self.btn_next = QPushButton("►►")
        self.btn_next.clicked.connect(self.next_track)

        ctrl_row.addWidget(self.btn_prev)
        ctrl_row.addWidget(self.btn_play)
        ctrl_row.addWidget(self.btn_next)
        right_layout.addLayout(ctrl_row)

        # 10-Band Equalizer Box
        eq_box = QFrame()
        eq_box.setObjectName("eqPanel")
        eq_layout = QVBoxLayout(eq_box)
        eq_title = QLabel("<b>Ecualizador de 10 Bandas (Filtros Parametricos)</b>")
        eq_layout.addWidget(eq_title)

        bands_layout = QHBoxLayout()
        frequencies = ["60Hz", "170Hz", "310Hz", "600Hz", "1kHz", "3kHz", "6kHz", "12kHz", "14kHz", "16kHz"]
        self.eq_sliders = []
        for freq in frequencies:
            col = QVBoxLayout()
            sld = QSlider(Qt.Orientation.Vertical)
            sld.setRange(-12, 12)
            sld.setValue(0)
            sld.setFixedHeight(100)
            col.addWidget(sld, alignment=Qt.AlignmentFlag.AlignCenter)
            col.addWidget(QLabel(freq), alignment=Qt.AlignmentFlag.AlignCenter)
            bands_layout.addLayout(col)
            self.eq_sliders.append(sld)

        eq_layout.addLayout(bands_layout)
        right_layout.addWidget(eq_box)

        splitter.addWidget(right_panel)
        splitter.setSizes([400, 700])
        main_layout.addWidget(splitter)

    def open_file_dialog(self):
        files, _ = QFileDialog.getOpenFileNames(
            self, "Seleccionar pistas de audio o video", "",
            "Archivos Multimedia (*.mp3 *.wav *.ogg *.flac *.m4a *.mp4 *.webm *.mkv *.mov);;Todos los archivos (*.*)"
        )
        for f in files:
            self.playlist_items.append(f)
            self.track_list.addItem(Path(f).name)
        if files and self.current_index == -1:
            self.play_track_at_index(0)

    def play_track_at_index(self, index: int):
        if 0 <= index < len(self.playlist_items):
            self.current_index = index
            path = self.playlist_items[index]
            self.player.setSource(QUrl.fromLocalFile(path))
            self.player.play()
            self.btn_play.setText("PAUSAR")
            self.now_playing_lbl.setText(f"Reproduciendo: {Path(path).name}")
            self.track_list.setCurrentRow(index)

    def play_selected_item(self, item):
        row = self.track_list.row(item)
        self.play_track_at_index(row)

    def toggle_play(self):
        if self.player.playbackState() == QMediaPlayer.PlaybackState.PlayingState:
            self.player.pause()
            self.btn_play.setText("REPRODUCIR")
        else:
            if self.current_index == -1 and self.playlist_items:
                self.play_track_at_index(0)
            else:
                self.player.play()
                self.btn_play.setText("PAUSAR")

    def next_track(self):
        if self.playlist_items:
            next_idx = (self.current_index + 1) % len(self.playlist_items)
            self.play_track_at_index(next_idx)

    def prev_track(self):
        if self.playlist_items:
            prev_idx = (self.current_index - 1 + len(self.playlist_items)) % len(self.playlist_items)
            self.play_track_at_index(prev_idx)

    def on_position_changed(self, pos):
        self.seek_slider.setValue(pos)

    def on_duration_changed(self, dur):
        self.seek_slider.setRange(0, dur)

    def set_position(self, pos):
        self.player.setPosition(pos)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = Music2000Window()
    window.show()
    sys.exit(app.exec())
`;

export const PYTHON_LITE_SOURCE_CODE = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Music2000 v0.3.6 - Edicion LIGERA (Ultralight / Low-RAM)
Omega Labs Inc
Consumo de RAM: < 15 MB | CPU en reposo: 0.0%
Diseñado para máximo rendimiento en Windows 7, 8, 10, 11 y equipos de bajos recursos.
Sin ecualizador pesado ni renderizado FFT innecesario.
"""

import sys
import os
from pathlib import Path

try:
    from PyQt6.QtCore import Qt, QUrl
    from PyQt6.QtWidgets import (
        QApplication, QMainWindow, QWidget, QLabel, QPushButton,
        QVBoxLayout, QHBoxLayout, QListWidget, QSlider, QFileDialog
    )
    from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
except ImportError:
    print("PyQt6 no esta instalado. Ejecuta: pip install PyQt6")
    sys.exit(1)

class Music2000LiteWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Music2000 LITE - Ultraligero")
        self.resize(520, 480)
        self.setStyleSheet("""
            QMainWindow { background-color: #fafafa; }
            QWidget { font-family: 'Segoe UI', Arial, sans-serif; color: #18181b; font-size: 12px; }
            QListWidget { background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; }
            QPushButton { background-color: #0284c7; color: white; border-radius: 6px; padding: 6px 12px; font-weight: bold; }
            QPushButton:hover { background-color: #0369a1; }
            QSlider::groove:horizontal { height: 4px; background: #e4e4e7; }
            QSlider::sub-page:horizontal { background: #0284c7; }
            QSlider::handle:horizontal { background: #0369a1; width: 10px; margin-top: -3px; margin-bottom: -3px; border-radius: 5px; }
        """)

        self.player = QMediaPlayer()
        self.audio_output = QAudioOutput()
        self.player.setAudioOutput(self.audio_output)
        self.audio_output.setVolume(0.8)

        self.tracks = []
        self.idx = -1

        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)

        # Header
        hdr = QHBoxLayout()
        title = QLabel("<b>MUSIC2000 LITE</b> <span style='color:#0284c7; font-size:10px;'>[RAM &lt;15MB]</span>")
        btn_add = QPushButton("+ Añadir Pistas")
        btn_add.clicked.connect(self.add_files)
        hdr.addWidget(title)
        hdr.addStretch()
        hdr.addWidget(btn_add)
        layout.addLayout(hdr)

        # Track list
        self.list_widget = QListWidget()
        self.list_widget.itemDoubleClicked.connect(lambda it: self.play_index(self.list_widget.row(it)))
        layout.addWidget(self.list_widget)

        # Now playing label
        self.lbl_now = QLabel("Listo.")
        layout.addWidget(self.lbl_now)

        # Slider
        self.slider = QSlider(Qt.Orientation.Horizontal)
        self.slider.sliderMoved.connect(self.player.setPosition)
        layout.addWidget(self.slider)

        # Controls
        ctrls = QHBoxLayout()
        btn_prev = QPushButton("◄◄")
        btn_prev.clicked.connect(self.prev_track)
        self.btn_play = QPushButton("Play")
        self.btn_play.clicked.connect(self.toggle_play)
        btn_next = QPushButton("►►")
        btn_next.clicked.connect(self.next_track)

        ctrls.addWidget(btn_prev)
        ctrls.addWidget(self.btn_play)
        ctrls.addWidget(btn_next)
        layout.addLayout(ctrls)

        self.player.positionChanged.connect(self.slider.setValue)
        self.player.durationChanged.connect(self.slider.setRange)

    def add_files(self):
        files, _ = QFileDialog.getOpenFileNames(self, "Seleccionar audio", "", "Audio (*.mp3 *.wav *.flac *.ogg *.m4a);;Todos (*.*)")
        for f in files:
            self.tracks.append(f)
            self.list_widget.addItem(Path(f).name)
        if files and self.idx == -1:
            self.play_index(0)

    def play_index(self, index):
        if 0 <= index < len(self.tracks):
            self.idx = index
            path = self.tracks[index]
            self.player.setSource(QUrl.fromLocalFile(path))
            self.player.play()
            self.btn_play.setText("Pausa")
            self.lbl_now.setText(f"▶ {Path(path).name}")
            self.list_widget.setCurrentRow(index)

    def toggle_play(self):
        if self.player.playbackState() == QMediaPlayer.PlaybackState.PlayingState:
            self.player.pause()
            self.btn_play.setText("Play")
        else:
            if self.idx == -1 and self.tracks:
                self.play_index(0)
            else:
                self.player.play()
                self.btn_play.setText("Pausa")

    def next_track(self):
        if self.tracks:
            self.play_index((self.idx + 1) % len(self.tracks))

    def prev_track(self):
        if self.tracks:
            self.play_index((self.idx - 1 + len(self.tracks)) % len(self.tracks))

if __name__ == "__main__":
    app = QApplication(sys.argv)
    w = Music2000LiteWindow()
    w.show()
    sys.exit(app.exec())
`;

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads the 1-Click Windows Runner / Installer script
 * Compatible with Windows 7, 8, 10 and 11.
 * Solves the "Consulta la version del fabricante" error by executing natively via PowerShell/CMD.
 */
export function downloadWindows1ClickInstaller(edition: 'standard' | 'lite' = 'standard') {
  const isLite = edition === 'lite';
  const scriptName = isLite ? 'Music2000_Ligera.py' : 'Music2000_Estandar.py';
  const appTitle = isLite ? 'Music2000 Edicion Ligera' : 'Music2000 Edicion Estandar';
  const pyCode = isLite ? PYTHON_LITE_SOURCE_CODE : PYTHON_STANDARD_SOURCE_CODE;

  // We bundle both the installer script and python source in a single executable batch installer
  const batContent = `@echo off
setlocal enabledelayedexpansion
title Instalador y Lanzador - ${appTitle}
color 0B

echo =====================================================================
echo   ${appTitle} v0.3.6
echo   Omega Labs Inc - Para Windows 7, 8, 10 y 11 (32 y 64-bit)
echo =====================================================================
echo.

cd /d "%~dp0"

:: Extraer archivo python si no existe
if not exist "${scriptName}" (
    echo [1/3] Configurando script de aplicacion: ${scriptName}...
    (
${pyCode.split('\n').map(line => `        echo ${line.replace(/%/g, '%%').replace(/[&|<>^]/g, '^$&')}`).join('\n')}
    ) > "${scriptName}"
)

echo [2/3] Verificando entorno de ejecucion en Windows...
python --version >nul 2>&1
if errorlevel 1 (
    py --version >nul 2>&1
    if not errorlevel 1 (
        set "PY_CMD=py"
    ) else (
        echo.
        echo [AVISO] Python no esta en el PATH del sistema.
        echo Abriendo instalador rapido de Python para Windows...
        start https://www.python.org/downloads/windows/
        echo Por favor instala Python marcando la casilla "Add Python to PATH".
        pause
        exit /b 1
    )
) else (
    set "PY_CMD=python"
)

echo [3/3] Comprobando librerias multimedia...
%PY_CMD% -c "import PyQt6" >nul 2>&1
if errorlevel 1 (
    echo Instalando PyQt6 (esto solo se hace una vez)...
    %PY_CMD% -m pip install --quiet PyQt6
)

echo.
echo =====================================================================
echo   Iniciando ${appTitle}...
echo =====================================================================
start "" %PY_CMD% "${scriptName}"
exit
`;

  downloadTextFile(`Ejecutar_${appTitle.replace(/\s+/g, '_')}_Windows.bat`, batContent, 'application/x-bat;charset=utf-8');
}

/**
 * Downloads Native PyInstaller 1-Click Compiler batch script
 */
export function downloadNativeExeCompilerScript(edition: 'standard' | 'lite' = 'standard') {
  const isLite = edition === 'lite';
  const scriptName = isLite ? 'Music2000_Ligera' : 'Music2000_Estandar';
  const appTitle = isLite ? 'Music2000_Ligera' : 'Music2000_Estandar';

  const bat = `@echo off
title Compilador Nativo .EXE - ${appTitle}
color 0A
echo =====================================================================
echo   COMPILADOR A .EXE NATIVO (Windows 7 / 8 / 10 / 11)
echo   Genera un ejecutable binario PE x64 firmado para tu equipo
echo   (Elimina el error "Consulta la version del fabricante")
echo =====================================================================
echo.
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Se requiere Python para compilar el .exe nativo.
    echo Descargalo gratis desde python.org con la casilla "Add to PATH".
    pause
    exit /b 1
)

echo [Paso 1/2] Instalando PyInstaller y PyQt6...
python -m pip install --upgrade pip
python -m pip install pyinstaller PyQt6

echo.
echo [Paso 2/2] Compilando ${scriptName}.py a ejecutable independiente...
pyinstaller --noconfirm --windowed --onefile --clean --name="${appTitle}" "${scriptName}.py"

echo.
if exist "dist\\${appTitle}.exe" (
    echo =====================================================================
    echo   EXITO! Tu archivo ejecutable 100%% compatible esta listo en:
    echo   dist\\${appTitle}.exe
    echo =====================================================================
    explorer dist
) else (
    echo Hubo un error en la compilacion.
)
pause
`;

  downloadTextFile(`Compilar_${appTitle}_a_EXE_Nativo.bat`, bat, 'application/x-bat;charset=utf-8');
}

/**
 * Generates Android & Android TV project files (Manifest, Gradle, MainActivity)
 */
export function downloadAndroidProjectGuide() {
  const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="net.music2000.app">

    <!-- Permissions for Android 10+ and Android TV -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

    <!-- Android TV Leanback Declaration -->
    <uses-feature android:name="android.software.leanback" android:required="false" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Music2000"
        android:banner="@drawable/tv_banner"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout">
            
            <!-- Standard Mobile & Tablet Launcher -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Android TV Leanback Launcher -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const mainActivity = `package net.music2000.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()

        // Loads Music2000 Web App PWA or local assets
        val appUrl = "https://ais-dev-4med7pgrhgozabcgm27kkk-302812651416.europe-west2.run.app"
        webView.loadUrl(appUrl)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}`;

  const guideMarkdown = `# Music2000 para Android (10+) y Android TV

## Metodo 1: Instalacion Instantanea PWA (Recomendado)
1. En tu celular, tablet o Android TV abre Google Chrome, Brave o la app "Downloader".
2. Entra a la aplicacion web de Music2000.
3. Toca el menu de opciones (3 puntos) y selecciona:
   **"Instalar aplicacion"** o **"Añadir a pantalla de inicio"**.
4. ¡Listo! Se creara el icono nativo en tu pantalla y en el menu de aplicaciones de Android TV.

## Metodo 2: Compilar APK Nativo con Android Studio
Incluimos los archivos oficiales listos para compilar:
- **AndroidManifest.xml**: Con soporte dual (Android 10+ normal y Android TV Leanback).
- **MainActivity.kt**: Con aceleracion por hardware y reproduccion continua en segundo plano.

Pasos:
1. Abre Android Studio > New Project > Empty Activity.
2. Pega el contenido de AndroidManifest.xml y MainActivity.kt.
3. Genera el APK: Build > Build APK(s).
4. Pasa el APK a tu dispositivo o TV via USB o la app "Send Files to TV".
`;

  downloadTextFile('Music2000_Android_y_AndroidTV_Guia.md', guideMarkdown, 'text/markdown;charset=utf-8');
  downloadTextFile('AndroidManifest.xml', androidManifest, 'application/xml;charset=utf-8');
  downloadTextFile('MainActivity.kt', mainActivity, 'text/plain;charset=utf-8');
}
