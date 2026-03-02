import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Settings,
  AlertCircle,
  Calendar,
  Users,
  Target,
  TrendingUp,
  LogOut,
  GitPullRequest,
  ArrowRightLeft,
  FileText,
  Building,
  PlusCircle,
  DollarSign,
  Plug,
  Eye,
  TicketIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
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
  useSidebar,
} from '@/components/ui/sidebar';

const adminMenuGroups = [
  {
    label: 'Visão Geral',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { title: 'Upload Diário', icon: Upload, href: '/upload' },
      { title: 'Gerencial', icon: FileText, href: '/gerencial' },
      { title: 'Relatórios', icon: TrendingUp, href: '/relatorios' },
      { title: 'Pendências', icon: AlertCircle, href: '/pendencias' },
      { title: 'Ajustes', icon: GitPullRequest, href: '/ajustes' },
      { title: 'Devedores', icon: AlertCircle, href: '/devedores' },
      { title: 'Visão Consultora', icon: Eye, href: '/visao-consultora' },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { title: 'Regras da Meta', icon: Settings, href: '/regras' },
      { title: 'Config. do Mês', icon: Calendar, href: '/configuracao-mes' },
      { title: 'Configuração', icon: Users, href: '/configuracao' },
    ],
  },
];

const consultoraMenuItems = [
  { title: 'Minha Performance', icon: TrendingUp, href: '/minha-performance' },
  { title: 'Gerencial', icon: FileText, href: '/gerencial' },
  { title: 'Solicitar Ajuste', icon: ArrowRightLeft, href: '/solicitar-ajuste' },
  { title: 'Devedores', icon: AlertCircle, href: '/devedores' },
  { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
];

const superAdminMenuGroups = [
  {
    label: 'Plataforma',
    items: [
      { title: 'Empresas', icon: Building, href: '/super-admin/empresas' },
      { title: 'Nova Empresa', icon: PlusCircle, href: '/super-admin/empresa/nova' },
      { title: 'Usuários', icon: Users, href: '/super-admin/usuarios' },
      { title: 'Tickets', icon: TicketIcon, href: '/super-admin/tickets' },
      { title: 'Financeiro', icon: DollarSign, href: '/super-admin/financeiro' },
      { title: 'Integrações', icon: Plug, href: '/super-admin/integracoes' },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut, isAdmin, isSuperAdmin, empresaNome, empresaLogoUrl } = useAuth();
  const { state } = useSidebar();
  const { hasPermission } = usePermissions();

  const roleLabel = isSuperAdmin ? 'Super Admin' : isAdmin ? 'Administrador' : 'Consultora';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-4">
          {!isSuperAdmin && empresaLogoUrl ? (
            <img src={empresaLogoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
          ) : !isSuperAdmin && empresaNome ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
              {empresaNome.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Target className="h-4 w-4" />
            </div>
          )}
          {state !== 'collapsed' && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                {!isSuperAdmin && empresaNome ? empresaNome : 'Sistema de Metas'}
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                {roleLabel}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {(isAdmin || isSuperAdmin) && adminMenuGroups.map((group) => {
          const visibleItems = group.items.filter(item => hasPermission(item.href));
          if (visibleItems.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-sidebar-foreground/60">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
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
          );
        })}

        {isSuperAdmin && superAdminMenuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
        ))}

        {!isAdmin && !isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              Menu
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {consultoraMenuItems
                  .filter(item => hasPermission(item.href))
                  .map((item) => (
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
        )}
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
