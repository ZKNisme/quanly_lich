import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lịch Tuần & Ví Bánh Bao",
    short_name: "Ví Bánh Bao",
    description:
      "Quản lý lịch học, chốt ca làm & tính lương Part-time chủ đề Bánh Bao Nhím.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6FAD9",
    theme_color: "#F6FAD9",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
