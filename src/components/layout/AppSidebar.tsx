import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Table,
  Settings,
  AlertCircle,
  Calendar,
  Users,
  Target,
  TrendingUp,
  LogOut,
  ChevronLeft,
  GitPullRequest,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const adminMenuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { title: 'Upload Diário', icon: Upload, href: '/upload' },
  { title: 'Gerencial', icon: Table, href: '/gerencial' },
  { title: 'Regras da Meta', icon: Settings, href: '/regras' },
  { title: 'Pendências', icon: AlertCircle, href: '/pendencias' },
  { title: 'Config. do Mês', icon: Calendar, href: '/configuracao-mes' },
  { title: 'Consultoras', icon: Users, href: '/consultoras' },
  { title: 'Metas', icon: Target, href: '/metas' },
  { title: 'Ajustes', icon: GitPullRequest, href: '/ajustes' },
];

const consultoraMenuItems = [
  { title: 'Minha Performance', icon: TrendingUp, href: '/minha-performance' },
  { title: 'Solicitar Ajuste', icon: ArrowRightLeft, href: '/solicitar-ajuste' },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, role, signOut, isAdmin } = useAuth();
  const { state } = useSidebar();

  const menuItems = isAdmin ? adminMenuItems : consultoraMenuItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Target className="h-4 w-4" />
          </div>
          {state !== 'collapsed' && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                Sistema de Metas
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                {isAdmin ? 'Administrador' : 'Consultora'}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex flex-col gap-2 p-2">
          {state !== 'collapsed' && user && (
            <div className="px-2 py-1">
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            {state !== 'collapsed' && <span>Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
