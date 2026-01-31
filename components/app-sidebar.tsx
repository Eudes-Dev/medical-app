"use client";

/**
 * Sidebar de l'application médicale
 *
 * Navigation principale de l'espace praticien avec:
 * - Logo et nom de l'application
 * - Menu de navigation principal (Dashboard, Agenda, Patients)
 * - Menu secondaire (Paramètres)
 * - Informations utilisateur avec déconnexion
 *
 * @module components/app-sidebar
 */

import * as React from "react";
import {
  Calendar,
  Settings,
  LayoutDashboard,
  Stethoscope,
  Users,
} from "lucide-react";
import Link from "next/link";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * Données de navigation de l'application médicale.
 */
const data = {
  user: {
    name: "Dr. Eudes",
    email: "djeya.j@gmail.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Agenda",
      url: "/dashboard/calendar",
      icon: Calendar,
    },
    {
      title: "Patients",
      url: "/dashboard/patients",
      icon: Users,
    },
  ],
  navSecondary: [
    {
      title: "Paramètres",
      url: "/dashboard/settings",
      icon: Settings,
    },
  ],
};

/**
 * Composant Sidebar de l'application.
 *
 * Structure:
 * - Header: Logo et nom de l'application
 * - Content: Navigation principale et secondaire
 * - Footer: Informations utilisateur et déconnexion
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      {/* Header avec logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-primary text-white flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Stethoscope className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Medical App</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Espace praticien
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation principale */}
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavMain items={data.navSecondary} label="Configuration" />
      </SidebarContent>

      {/* Footer avec utilisateur */}
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
