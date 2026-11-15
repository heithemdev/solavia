"use client";
import { usePathname, useSearchParams } from "next/navigation";
import Dashboard from "@/components/admin/dashboard/dashboard";
import Orders from "@/components/admin/orders/orders";
import Pixel from "@/components/admin/pixel/pixel";
import Login from "@/components/admin/login";
import {Suspense} from "react";
export default function Loading() {
  return <Suspense fallback={<Dashboard days={30}/>}><Content/></Suspense>;
}
function Content(){
  const path = usePathname(),
    params = useSearchParams();
  if (path.endsWith("/login")) return <Login />;
  if (path.endsWith("/orders")) return <Orders />;
  if (path.endsWith("/pixel"))
    return <Pixel pixelId="" hasToken={false} loading />;
  const days = [7, 30, 90].includes(Number(params.get("days")))
    ? Number(params.get("days"))
    : 30;
  return <Dashboard days={days} />;
}
