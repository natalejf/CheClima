# CheClima — Monitor Agroclimático y Toma de Decisiones

**CheClima** es una plataforma web agroclimática integral diseñada para que el productor y contratista rural argentino cuente en un único lugar con un panorama claro para la toma de decisiones sobre **Fumigación**, **Pulverización** y **Cosecha**.

Toda la información se obtiene en tiempo real a partir de **APIs gratuitas y modelos públicos** (Open-Meteo, ECMWF y Windy), combinados con modelos agronómicos de Buenas Prácticas Agrícolas (BPA).

---

## 🌾 Funcionalidades Principales

1. **Eliminación del módulo de siembra:**
   - La plataforma se enfoca 100% en la toma de decisiones operativas inmediatas: **Fumigación de precisión**, **Pulverización terrestre** y **Cosecha/Trilla**.

2. **Centro de Decisiones y Asesoramiento Agronómico:**
   - **Calibración de Boquillas y Gotas:** Recomendación de tipo de pastilla (Abanico Plano estándar, Cono Hueco, Antideriva con Aire Inducido AI/TTI/IDK), presión operativa de trabajo (bar), tamaño de gota y coadyuvante según velocidad del viento, ráfagas y Delta T.
   - **Punto de Rocío y Humedad Foliar:** Cálculo en tiempo real de temperatura de condensación y margen delta para evitar escurrimiento de caldo o pérdidas en trilla por hojas mojadas.
   - **Resistencia al Lavado (Rainfastness - 6h):** Análisis predictivo de precipitaciones en las próximas 6 horas para autorizar o suspender aplicaciones de fitosanitarios.
   - **Dictamen de Cosecha Comercial:** Dictamen técnico sobre aptitud de trilla considerando humedad relativa ambiente y riesgo de sobrehumedad en tolva.

3. **Calculadora Rápida de Pulverización y Caldo:**
   - Cálculo automático de hectáreas cubiertas por capacidad de tanque (L) y tasa de aplicación (L/ha).
   - Cálculo de producto fitosanitario comercial y dosis requerida de coadyuvante/antievaporante.

4. **Monitores Agronómicos en Vivo:**
   - **Delta T (°C):** Fórmula Stull de psicrometría para evaluar evaporación de gota y riesgo de inversión.
   - **Riesgo de Inversión Térmica:** Detección de calma chicha (< 3 km/h) y derivas gaseosas.
   - **Piso en Lote y Tránsito:** Humedad volumétrica superficial del suelo (0-1 cm) y precipitaciones acumuladas.
   - **Alerta de Heladas:** Detección de heladas meteorológicas y agronómicas.

5. **Planificador Semanal a 7 Días:**
   - Desglose día por día con semáforos de labor (Fumigación, Pulverización, Cosecha).
   - Identificación de los mejores días de la semana y ventanas horarias continuas recomendadas.
   - Evolución y giros del viento por franjas horarias (mañana, tarde y noche).

6. **Radar Meteorológico Satelital Windy ECMWF:**
   - Mapa interactivo integrado para monitoreo de frentes de viento y tormentas.

7. **Diseño Responsive Desktop & Mobile:**
   - Interfaz con modo oscuro y modo claro, microanimaciones y accesos rápidos a localidades agrícolas líderes (Necochea, Pergamino, Rosario, Tandil, Balcarce, Río Cuarto, Marcos Juárez, Rafaela, Venado Tuerto, etc.).

---

## 🚀 Tecnologías

- **React + Vite**
- **Vanilla CSS (Design Tokens, Glassmorphism, Responsive)**
- **Lucide Icons**
- **Open-Meteo Forecast & Geocoding APIs (Gratuitas)**
- **Windy Map Embed**

---

## 🛠️ Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Generar build de producción
npm run build
```

---

Desarrollado para el sector agropecuario por **Juan Francisco Natale**.
