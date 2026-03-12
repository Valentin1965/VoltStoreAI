# Експорт товарів (опис + технічні характеристики) у CSV

У Supabase **немає прав** на `COPY TO 'файл'` (запис на диск сервера). Нижче — варіанти, що працюють.

---

## Варіант 1: Supabase Dashboard → завантажити результат як CSV

1. Відкрийте **Supabase → SQL Editor**.
2. Вставте один із запитів нижче (це звичайний `SELECT`, без `COPY`).
3. Натисніть **Run**.
4. У панелі результатів використайте кнопку **Download** / **Export CSV** (якщо є) або скопіюйте дані в таблицю й збережіть як CSV у себе.

---

## Варіант 2: psql — `\copy` (файл зберігається на вашому ПК)

Підключіться до БД через **psql** (Connection string у Supabase: Project Settings → Database):

```bash
psql "postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
```

Потім виконайте **\copy** — це клієнтська команда, файл пишеться вже на ваш диск:

```sql
\copy (
  SELECT
    'battery' AS category,
    id,
    "BrandProd"       AS brand,
    "ModelName"       AS model,
    description,
    "CapKwh"          AS capacity_kwh,
    "NomVoltV"        AS voltage_v,
    "CycleLife"       AS cycle_life,
    "MaxChgDchgCur_A" AS max_current_a,
    "BattChem"        AS chemistry,
    "DimsMm"          AS dimensions_mm,
    "WgtKg"           AS weight_kg
  FROM batteries
  UNION ALL
  SELECT
    'inverter',
    id,
    "BrandProd",
    "ModelName",
    description,
    "NomPowKw",
    "Phases",
    "MaxEffPerc",
    "NumMppts",
    "MpptVoltRangeV",
    "MaxPvInVoltV",
    "InvType"
  FROM inverters
  UNION ALL
  SELECT
    'solar_panel',
    id,
    "BrandProd",
    "ModelName",
    description,
    "RatedPwrWp",
    "ModEffPerc",
    "SolarPanelType",
    "CellTech",
    "DimsMm",
    "WgtKg",
    NULL
  FROM solar_panels
  UNION ALL
  SELECT
    'ev_charger',
    id,
    "BrandProd",
    "ModelName",
    description,
    "ChgPwrKw",
    "ConnType",
    "AuthMeth",
    "OcppVer",
    "DynLoadMng",
    "V2gSupp",
    NULL
  FROM ev_chargers
  UNION ALL
  SELECT
    'heat_pump',
    id,
    "BrandProd",
    "ModelName",
    description,
    "HpType",
    "HeatCapKw",
    "Scop35C",
    "RefrType",
    "SndPwrDba",
    NULL,
    NULL
  FROM heat_pumps
  UNION ALL
  SELECT
    'kit',
    id,
    "BrandProd",
    "ModelName",
    description,
    "TotalPowerKw",
    "NumPanels",
    "BatteryCapKwh",
    NULL,
    NULL,
    NULL,
    NULL
  FROM kits
) TO 'products_export.csv' WITH CSV HEADER ENCODING 'UTF8';
```

**Увага:** у `UNION ALL` у всіх частинах має бути **однакова кількість колонок**. Якщо в якійсь таблиці менше полів — доповніть `NULL AS missing_column`. Наведений приклад можна підлаштувати під реальні назви колонок у вашій схемі.

---

## Варіант 3: Тільки SELECT (без COPY) — для копіювання в Excel/CSV вручну

Якщо потрібен один спільний результат по всіх товарах для вставки в Supabase SQL Editor:

```sql
-- Один результат: опис + технічні поля з усіх товарних таблиць.
-- Кількість і назви колонок мають збігатися в кожному SELECT (доповнюйте NULL при потребі).

SELECT 'battery' AS category, id, "BrandProd" AS brand, "ModelName" AS model, description,
       "CapKwh" AS capacity_kwh, "NomVoltV" AS voltage_v, "CycleLife" AS cycle_life,
       "MaxChgDchgCur_A" AS max_current_a, "BattChem" AS chemistry,
       "DimsMm" AS dimensions_mm, "WgtKg" AS weight_kg
FROM batteries
UNION ALL
SELECT 'inverter', id, "BrandProd", "ModelName", description,
       "NomPowKw", "Phases", "MaxEffPerc", "NumMppts", "MpptVoltRangeV", "MaxPvInVoltV", "InvType"
FROM inverters
UNION ALL
SELECT 'solar_panel', id, "BrandProd", "ModelName", description,
       "RatedPwrWp", "ModEffPerc", "SolarPanelType", "CellTech", "DimsMm", "WgtKg", NULL
FROM solar_panels
UNION ALL
SELECT 'ev_charger', id, "BrandProd", "ModelName", description,
       "ChgPwrKw", "ConnType", "AuthMeth", "OcppVer", "DynLoadMng", "V2gSupp", NULL
FROM ev_chargers
UNION ALL
SELECT 'heat_pump', id, "BrandProd", "ModelName", description,
       "HpType", "HeatCapKw", "Scop35C", "RefrType", "SndPwrDba", NULL, NULL
FROM heat_pumps
UNION ALL
SELECT 'kit', id, "BrandProd", "ModelName", description,
       "TotalPowerKw", "NumPanels", "BatteryCapKwh", NULL, NULL, NULL, NULL
FROM kits;
```

Після Run у Supabase можна виділити результат і зберегти як CSV (наприклад, через браузер або вставку в Excel з роздільником кома/табуляція).

---

## Чому виникала помилка

- `COPY (...) TO '/tmp/file.csv'` — це запис **на диск сервера** БД.
- У Supabase та інших хостованих інстансах це заборонено з міркувань безпеки (потрібна роль `pg_write_server_files`).
- **COPY (...) TO STDOUT** — дозволено (результат у stdout).
- **\copy** у psql — теж дозволено: файл пишеться на **вашому** комп’ютері, не на сервері.

Якщо назви колонок у ваших таблицях відрізняються, спочатку перевірте їх:

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('batteries', 'inverters', 'solar_panels', 'ev_chargers', 'heat_pumps', 'kits')
ORDER BY table_name, ordinal_position;
```

Підставте отримані імена полів у запити вище.
