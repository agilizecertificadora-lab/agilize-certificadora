UPDATE orders
SET payment_txid = replace(payment_txid, '-', '')
WHERE payment_txid IS NOT NULL AND payment_txid LIKE '%-%';
