import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SvgIconProps,
  Toolbar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

export interface NavItem {
  label: string;
  path: string;
  icon?: React.ComponentType<SvgIconProps>;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
}

const DRAWER_WIDTH = 240;

export function Sidebar({ open, onClose, navItems }: SidebarProps): React.ReactElement {
  const navigate = useNavigate();

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                onClose();
              }}
            >
              {item.icon && (
                <ListItemIcon>
                  <item.icon />
                </ListItemIcon>
              )}
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
