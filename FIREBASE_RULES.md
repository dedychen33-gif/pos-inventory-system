# Firebase Realtime Database Rules

## Cara Update Rules:

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project: **pos-inventory-5eb73**
3. Klik **Realtime Database** di menu kiri
4. Klik tab **Rules**
5. Ganti rules dengan yang di bawah ini:

## Rules yang Benar (Izinkan semua akses):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## Atau Rules dengan Struktur Spesifik:

```json
{
  "rules": {
    "products": {
      ".read": true,
      ".write": true
    },
    "categories": {
      ".read": true,
      ".write": true
    },
    "units": {
      ".read": true,
      ".write": true
    },
    "customers": {
      ".read": true,
      ".write": true
    },
    "transactions": {
      ".read": true,
      ".write": true
    },
    "suppliers": {
      ".read": true,
      ".write": true
    },
    "purchases": {
      ".read": true,
      ".write": true
    },
    "salesOrders": {
      ".read": true,
      ".write": true
    },
    "expenses": {
      ".read": true,
      ".write": true
    },
    "debts": {
      ".read": true,
      ".write": true
    },
    "employees": {
      ".read": true,
      ".write": true
    },
    "kasbons": {
      ".read": true,
      ".write": true
    },
    "returns": {
      ".read": true,
      ".write": true
    },
    "settings": {
      ".read": true,
      ".write": true
    }
  }
}
```

6. Klik **Publish** untuk menyimpan

## Catatan:
- Rules di atas mengizinkan semua akses (read & write)
- Untuk production, sebaiknya tambahkan authentication
