# Programming NFC cards

The app never writes chips itself. Writing is a manual step, done by you or your card supplier, using the CSV from **Admin → Card batches**. This document explains how to do it and how to check the result.

## What goes on the chip

Exactly one thing: the card's permanent URL, for example

```
https://YOUR-DOMAIN/c/Xq3v9mR2tLw8pZc1nB4dKa
```

- One **NDEF URI record**, nothing else. No vCard, no text record, no personal data.
- The URL never changes. Customers change where the card goes inside the app, so the chip never needs rewriting.
- The domain must be the production `CARD_DOMAIN`, and you must keep that domain forever. If it lapses or changes, every card ever sold stops working.

## Recommended chips

| Chip | User memory | Notes |
|---|---|---|
| **NTAG215** | 504 bytes | Good default. Plenty of room for one URL. |
| **NTAG216** | 888 bytes | Also fine. Costs a little more. |
| NTAG213 | 144 bytes | Works (our URLs are short) but leaves little margin. |

All of these read on iPhone (XS and later, in the background) and on Android phones with NFC switched on. For **metal cards**, the chip must be an on-metal or ferrite-backed inlay positioned under a non-metal window. A standard inlay behind steel won't read.

## Steps

1. **Create a batch** in Admin → Card batches. The CSV with claim codes downloads once. Columns:
   - `token`: the card's identifier
   - `url`: what to write to the chip, and what the QR code encodes
   - `claim_code`: print this inside the packaging, not on the card
   - `qr_file`: the matching file in the batch's QR zip
2. **Download the QR zip** from the same row. It holds one SVG per card for printing on the card, plus a CSV without claim codes.
3. **Write each chip.** Use NXP **TagWriter** (Android or iOS) or a USB writer such as an ACR122U with its software:
   1. Choose *Write tags → New dataset → Link / URI*.
   2. Paste the `url` for this card exactly, including `https://`.
   3. Write it to the card.
   4. Keep each chip, its QR code and its claim code together. They must belong to the same row.
4. **Verify before locking.** For each card, or a sample of each batch, check all of the following:
   - [ ] Tapping with an **iPhone** shows a banner that opens the URL.
   - [ ] Tapping with an **Android** phone opens the URL.
   - [ ] Scanning the printed **QR code** opens the same URL.
   - [ ] For an unclaimed card, the page says **"Activate your card"**.
   - [ ] Reading the chip in TagWriter shows exactly **one** URI record with the expected token.
5. **Lock the chip** (make it read-only) once verified. In TagWriter: *Write tags → Lock tag* (wording varies by version). This stops anyone overwriting the link to send people somewhere else. Locking is permanent, and that's safe because the URL never needs to change.
6. **Package** each card with its claim code. Shred or securely delete the claim-code CSV once printing is done. If it's lost before printing, use **New claim codes** on the batch. That replaces the codes for all unclaimed cards in it.

## Fulfilling an order

1. In **Admin → Orders**, open the order.
2. Under each line, paste the URLs of the physical cards you're sending, or leave the box empty to take the next ones from stock.
3. Choose **Assign cards**:
   - If the order came from a signed-in account, the cards are activated for that customer straight away.
   - If it was a guest order, the customer activates each card by tapping it and entering its claim code.
4. Mark the order **Shipped** with the tracking number. The customer gets an email.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| iPhone does nothing | The phone is locked or the screen is off, the chip is too far from the top edge of the phone, or the card is metal without an on-metal inlay. |
| Opens the wrong site | The wrong row was written. Rewrite before locking. After locking, retire the card: Admin → Cards → disable. |
| "This card isn't active" | The owner deactivated it, an admin disabled it, or the token isn't in the database (the wrong environment's batch). |
| Works on Android, not iPhone | The record isn't a URI record (for example, it was written as text). Rewrite as a Link/URI. |
