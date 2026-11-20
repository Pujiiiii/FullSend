# ⚡ Full Send

Aplicació mòbil de telemetria GPS i seguiment de rutes en 3D (React Native amb Expo i Supabase) pensada per a cotxe, moto, bicicleta, esquí, snowboard i 4x4.

---

## 🗺️ Mapa 3D i Estètica Minimalista

- **Motor cartogràfic:** [MapLibre GL JS](https://maplibre.org/) (v3.6.2) amb càrrega resilient en doble CDN (`unpkg` + `jsdelivr`) i sense necessitat de tokens ni targetes de pagament.
- **Relleu 3D real:** Dades d'elevació reals amb **AWS Open Data Terrarium DEM** (`raster-dem`) combinades amb una capa de `hillshade` per donar volum, ombres i profunditat a muntanyes, valls i pendents.
- **Tessel·les vectorials:** [OpenFreeMap](https://openfreemap.org/) (`liberty` personalitzat).
- **Estil visual inspirat en Pokémon GO:**
  - Terreny verd suau natural i boscos en verd intens.
  - Carreteres, carrers i camins en blanc/gris clar amb vores discretes.
  - Aigua en blau cel clar.
  - Edificis, comerços i punts d'interès comercials ocults per donar tot el protagonisme al relleu i la ruta.
- **Càmera en perspectiva 3D:** Inclinació (`pitch`) de 58°, seguiment suau de la posició i orientació GPS, control tàctil per rotar/inclinar i mode 2D/3D intercanviable.
- **Rastre GPS en blau elèctric (`#00E5FF`):** Dibuix en temps real durant l'activitat i visualització completa en revisar sessions anteriors.

---

## 🚀 Funcionalitats principals

- **Send (Mapa en directe):**
  - Selecció ràpida de vehicle/modalitat des de la barra superior.
  - Velocímetre en directe (`KM/H`), distància, temps, velocitat punta i desnivell positiu.
  - Gravació en segon pla (`expo-location` + `expo-task-manager`) amb servei en primer pla a Android.
  - Canvi de tema visual (Pokémon GO, Muntanya Neu, Carretera Dark) i commutador 2D/3D.
- **Sessions:**
  - Historial de trajectes enregistrats amb mètriques detallades.
  - Visor modal 3D (`RouteMapModal`) amb marcadors d'inici 🟢, final 🏁 i cota màxima ⛰️, perfil altimètric interactiu i controls de càmera.
- **Garatge:**
  - Gestió dels teus vehicles i modalitats amb icona i color personalitzats.
- **Temporada:**
  - Resum anual ("Wrapped") amb estadístiques acumulades i gràfics mensuals.
- **Ajustos i Núvol:**
  - Persistència local immediata i sincronització opcional amb **Supabase** (`supabase/schema.sql`).

---

## 📱 Com provar l'aplicació al mòbil

1. Instal·la l'aplicació **Expo Go** a Android o iOS.
2. Instal·la les dependències si encara no ho has fet:
   ```bash
   npm install
   ```
3. Inicia el servidor de desenvolupament d'Expo:
   - **A la mateixa xarxa Wi-Fi:**
     ```bash
     npx expo start -c
     ```
   - **Amb dades mòbils o xarxes separades (túnel):**
     ```bash
     npx expo start --tunnel -c
     ```
4. Escaneja el codi QR amb Expo Go (o prem `r` al terminal per recarregar l'app).

---

## 🗄️ Configuració de Supabase (opcional)

1. Crea un projecte gratuït a [supabase.com](https://supabase.com).
2. Executa l'esquema de [supabase/schema.sql](file:///C:/Users/User/Documents/FullSend/supabase/schema.sql) a l'**SQL Editor** de Supabase.
3. Afegeix les claus al fitxer `.env` a l'arrel del projecte:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://el-teu-projecte.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=la-teva-anon-key
   ```
4. Reinicia Expo (`npx expo start -c`).

---

## 🛠️ Comandes útils

- `npx expo start -c`: Inicia Expo netejant la memòria cau.
- `npx tsc --noEmit`: Comprova els tipus de TypeScript.
- `npx expo-doctor`: Revisa l'estat de les dependències i configuració d'Expo.
