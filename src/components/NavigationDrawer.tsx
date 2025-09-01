import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  ShoppingCart, 
  Upload, 
  Eye, 
  Settings, 
  FileText, 
  Shield, 
  RotateCcw,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminMode } from '@/hooks/useAdminMode';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBuySlots: () => void;
  onManualEntry: () => void;
  onSearchSlot: () => void;
  onAdminAccess: () => void;
  selectedSlots: Set<string>;
}

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onBuySlots,
  onManualEntry,
  onSearchSlot,
  onAdminAccess,
  selectedSlots
}) => {
  const { isAdmin } = useAdminMode();
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'manual-entry',
      icon: Upload,
      label: 'Manual Entry',
      description: 'Upload to specific slots',
      onClick: onManualEntry,
      showForAdmin: false
    },
    {
      id: 'search-slot',
      icon: Eye,
      label: 'Search Slot',
      description: 'Find and view specific slots',
      onClick: onSearchSlot,
      showForAdmin: false
    },
    {
      id: 'admin',
      icon: Settings,
      label: isAdmin ? 'Exit Admin' : 'Admin',
      description: isAdmin ? 'Leave admin mode' : 'Access admin panel',
      onClick: onAdminAccess,
      showForAdmin: true
    }
  ];

  const legalItems = [
    {
      id: 'content-policy',
      icon: Shield,
      label: 'Content Policy',
      path: '/content-policy'
    },
    {
      id: 'terms',
      icon: FileText,
      label: 'Terms & Conditions',
      path: '/terms'
    },
    {
      id: 'refund-policy',
      icon: RotateCcw,
      label: 'Refund Policy',
      path: '/refund-policy'
    }
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-sidebar border-r border-sidebar-border z-50 sidebar-slide ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sidebar-border header-gradient">
          <div className="flex items-center gap-3">
            <Menu className="w-6 h-6 text-sidebar-primary" />
            <h2 className="text-lg font-cyber font-bold text-sidebar-foreground">Menu</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground hover:bg-sidebar-accent/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Buy Slots Button - Prominent */}
        {!isAdmin && (
          <div className="p-6 border-b border-sidebar-border">
            <Button
              onClick={onBuySlots}
              disabled={selectedSlots.size === 0}
              className="w-full h-16 neon-bg text-background font-cyber font-bold text-xl glow-hover disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-neon-pink to-neon-blue opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <ShoppingCart className="w-6 h-6 mr-3" />
              <div className="flex flex-col items-start">
                <span>Buy {selectedSlots.size} Slot{selectedSlots.size !== 1 ? 's' : ''}</span>
                {selectedSlots.size > 0 && (
                  <span className="text-sm font-futura opacity-90">
                    ${(selectedSlots.size * 0.50).toFixed(2)} USD
                  </span>
                )}
              </div>
            </Button>
            {selectedSlots.size === 0 && (
              <div className="mt-3 p-3 bg-sidebar-accent/10 rounded-lg border border-sidebar-accent/20">
                <p className="text-xs text-sidebar-foreground/70 text-center font-futura">
                  💡 Select rectangular areas on the grid to purchase video slots
                </p>
                <p className="text-xs text-sidebar-accent text-center font-futura mt-1">
                  $0.50 per slot • AI content only
                </p>
              </div>
            )}
          </div>
        )}

        {/* Main Navigation */}
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-futura font-semibold text-sidebar-foreground/80 uppercase tracking-wider mb-4">
            Navigation
          </h3>
          {menuItems
            .filter(item => !isAdmin || item.showForAdmin)
            .map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={item.onClick}
                  className="w-full justify-start h-12 px-4 text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-accent glow-hover group"
                >
                  <Icon className="w-5 h-5 mr-3 group-hover:text-sidebar-accent transition-colors" />
                  <div className="text-left">
                    <div className="font-futura font-medium">{item.label}</div>
                    <div className="text-xs text-sidebar-foreground/60 font-futura">{item.description}</div>
                  </div>
                </Button>
              );
            })}
        </div>

        {/* Legal Links */}
        <div className="p-4 border-t border-sidebar-border mt-auto">
          <h3 className="text-sm font-futura font-semibold text-sidebar-foreground/80 uppercase tracking-wider mb-4">
            Legal
          </h3>
          <div className="space-y-1">
            {legalItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className="w-full justify-start h-10 px-4 text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-accent text-sm font-futura"
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default NavigationDrawer;