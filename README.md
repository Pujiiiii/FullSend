# 📊 StatsTracker

Aplicació mòbil (React Native amb Expo i Supabase) per fer seguiment de qualsevol mètrica personal durant l'any natural, amb un **Recap anual** a l'estil "Spotify Wrapped" i comparativa històrica ("All-Time").

---

## 🚀 Característiques principals

* **Mètriques 100% lliures i adaptables:**
  * **Comptador simple (+1):** Cafès presos, llibres llegits, pel·lícules vistes, partits de pàdel...
  * **Mesura numèrica amb unitat:** Kms de running (km), hores de son (h), despeses o estalvis (€)...
  * **Hàbit / Check diari (Sí/No):** Meditació, beure 2L d'aigua, entrenar...
  * **Puntuació / Escala (1 a 5):** Estat d'ànim, nivell d'energia, productivitat...
* **Recap Anual ("Wrapped") & Històric:**
  * Selector d'any (2026, 2025, etc.).
  * Resum del total de registres i mètrica estrella de l'any.
  * Comparativa de l'any natural amb el total acumulat des que vas començar a fer servir l'app.
  * Mes rècord destacat per a cada mètrica.
  * Gràfic de barres mensual de gener a desembre.
* **Mode Demostració / Local:**
  * L'aplicació inclou dades d'exemple inicials i persistència local perquè puguis provar-la immediatament sense necessitat de configurar Supabase el primer dia.
* **Backend preparat amb Supabase:**
  * Esquema SQL complet amb Row Level Security (RLS) a `supabase/schema.sql`.

---

## 📱 Com provar l'aplicació al teu mòbil (Android / iOS)

1. Descarrega l'aplicació gratuïta **Expo Go** des de Google Play Store (o App Store).
2. Executa a la teva consola:
   ```bash
   npx expo start
   ```
3. Escaneja el codi QR que apareixerà a la consola amb l'app Expo Go del teu mòbil. L'aplicació s'obrirà al moment!

---

## 🗄️ Com connectar la teva Base de Dades Supabase

Quan vulguis sincronitzar al núvol:
1. Crea un compte i un projecte gratuït a [supabase.com](https://supabase.com).
2. Ves a l'apartat **SQL Editor** del panell de Supabase.
3. Copia el contingut de [`supabase/schema.sql`](file:///c:/Users/User/Documents/StatsTracker/supabase/schema.sql) i prem **Run**.
4. A les opcions del teu projecte (*Project Settings -> API*), copia l'URL i l'Anon Key.
5. Edita el teu fitxer `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://el-teu-projecte.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=la-teva-anon-key
   ```
6. Reinicia el servidor d'Expo (`npx expo start -c`) i podràs crear el teu compte d'usuari a la pestanya **Ajustos**.

---

## 🛠️ Comandes útils

* `npx expo start`: Iniciar el servidor de desenvolupament
* `npx tsc --noEmit`: Comprovació de tipus TypeScript
* `npx expo-doctor`: Diagnosi de salut del projecte Expo

