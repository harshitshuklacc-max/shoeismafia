CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (key, value)
VALUES (
  'barcode_printer',
  '{
    "printerName": "",
    "labelSize": "50x25",
    "barcodeType": "128",
    "connectionType": "usb",
    "showLogo": true,
    "showMrp": true,
    "copiesDefault": 1
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
