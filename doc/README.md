# Development notes

## To generate a QR code

Markup:

```
{<img
src={generateQRCode(songs[currentIndex].previewUrl)}
alt={`QR Code for song #${currentIndex}`}
className="w-full max-w-[200px] mb-4"
}
```

Code:

```
const generateQRCode = (previewUrl: string): string => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      previewUrl
    )}`;
  };
```
