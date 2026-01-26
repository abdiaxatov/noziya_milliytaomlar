"use client";

import React, { ReactElement, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coffee,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  MenuIcon,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "./admin-auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NavItem = memo(
  ({
    href,
    icon: Icon,
    title,
    isActive,
    isOpen,
    badge,
    isMobile
  }: {
    href: string;
    icon: ReactElement;
    title: string;
    isActive: boolean;
    isOpen?: boolean;
    badge?: string;
    isMobile?: boolean;
  }) => (
    <div className={cn("relative group", isMobile ? "flex-1" : "")}>
      <Link
        href={href}
        className={cn(
          "relative flex items-center transition-all duration-300 ease-in-out",
          isMobile
            ? "flex-col justify-center gap-1 p-2 rounded-xl"
            : "gap-3 rounded-xl px-2 py-2",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-primary",
          !isMobile && isActive && "bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm",
          !isMobile && !isOpen && "justify-center px-0 py-3",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          "active:scale-95 touch-manipulation"
        )}
      >
        <div className="relative">
          {/* @ts-ignore */}
          <Icon.type className={cn(
            "transition-transform duration-200",
            isMobile ? "h-6 w-6" : "h-5 w-5 shrink-0",
            isActive && "scale-110 drop-shadow-sm",
            !isMobile && "group-hover:scale-110"
          )} />
          {badge && (
            <Badge className={cn(
              "absolute p-0 text-[10px] bg-red-500 border-background flex items-center justify-center",
              isMobile ? "-top-1 -right-1 h-3.5 w-3.5 rounded-full" : "-top-2 -right-2 h-4 w-4"
            )}>
              {badge}
            </Badge>
          )}
        </div>

        {isMobile && (
          <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-primary font-bold" : "text-gray-500")}>
            {title}
          </span>
        )}

        {!isMobile && isOpen && (
          <div className="flex items-center justify-between w-full min-w-0">
            <span className="truncate font-medium">{title}</span>
            {badge && !isMobile && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {badge}
              </Badge>
            )}
            {isActive && (
              <ChevronRight className="h-4 w-4 ml-2 opacity-70" />
            )}
          </div>
        )}

        {!isMobile && !isOpen && (
          <div className="absolute left-full ml-3 px-2 py-2 bg-popover border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
            <span className="text-sm font-medium">{title}</span>
            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-b rotate-45"></div>
          </div>
        )}
      </Link>
    </div>
  )
);

NavItem.displayName = "NavItem";

export const AdminSidebar = memo(() => {
  const pathname = usePathname();
  const { open, toggleSidebar } = useSidebar();
  const { userRole, signOut } = useAuth();

  const navItems = [
    {
      href: "/admin/menu",
      icon: <Coffee />,
      title: "Menyu",
      roles: ["admin"],
    },
    {
      href: "/admin/analytics",
      icon: <Activity />,
      title: "Analitika",
      roles: ["admin"],
    },
    // Add more items here as they are uncommented/ready
  ];

  const filteredNavItems = userRole
    ? navItems.filter((item) => item.roles.includes(userRole.toLowerCase()))
    : [];

  const sidebarWidth = open
    ? "md:w-[220px] lg:w-[260px]"
    : "md:w-[64px] lg:w-[70px]";

  const logoutWidth = open
    ? "260px"
    : "70px";

  return (
    <>
      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-white/90 backdrop-blur-lg border-t border-gray-200 z-50 pb-safe">
        <div className="flex items-center justify-around h-full px-2">
          {filteredNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.title}
              isActive={pathname.startsWith(item.href)}
              isMobile={true}
              badge={item.badge}
            />
          ))}
          {/* Mobile Logout Button (optional, or put in settings) */}
          <button
            onClick={signOut}
            className="flex flex-col items-center justify-center gap-1 p-2 text-muted-foreground hover:text-red-500 rounded-xl"
          >
            <LogOut className="h-6 w-6" />
            <span className="text-[10px] font-medium">Chiqish</span>
          </button>
        </div>
      </div>

      {/* --- DESKTOP SIDEBAR --- */}
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-0 z-50 h-screen flex-col transition-all duration-300 ease-in-out",
          "border-r border-border/50 bg-gradient-to-b from-background via-background/95 to-background/90",
          "backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-xl",
          sidebarWidth
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex h-16 items-center border-b border-border/50 bg-background/60 backdrop-blur-sm px-4 transition-all duration-200",
          open ? "justify-between" : "justify-center"
        )}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5">
              <img src="/Logo.png" alt="Logo" className="h-8 w-8 object-contain" />
            </div>
            {open && (
              <div className="animate-in slide-in-from-left-2 duration-200">
                <h1 className="font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                  Noziya Milliy Taomlar
                </h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Admin Panel</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          <nav className={cn("space-y-1", open ? "px-3" : "px-2")}>
            {filteredNavItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                title={item.title}
                isActive={pathname.startsWith(item.href)}
                isOpen={open}
                badge={item.badge}
              />
            ))}
          </nav>
        </div>

        {/* Toggle button */}
        <Button
          onClick={toggleSidebar}
          variant="outline"
          size="icon"
          className={cn(
            "absolute -right-3 top-20 h-6 w-6 rounded-full shadow-md bg-background border border-border/50 hover:bg-muted z-50"
          )}
        >
          {open ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>

        {/* Logout */}
        <div className={cn("p-4 border-t border-border/50 bg-background/50")}>
          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              !open && "justify-center px-0"
            )}
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            {open && <span>Chiqish</span>}
          </Button>
        </div>
      </aside>
    </>
  );
});

AdminSidebar.displayName = "AdminSidebar";
