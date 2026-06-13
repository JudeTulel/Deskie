import React, { useState } from 'react'
import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar'
import settings from '../assets/images/gear.png'
import desk from '../assets/images/grid.png'
import book from '../assets/images/book.png'
import logo from '../assets/images/logo.png'

const Leftbar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true)

  const sideBarList = [
    {
      id: "desk",
      title: "Desk",
      icon: desk,
      link: "/desk"
    },
    {
      id: "library",
      title: "Library",
      icon: book,
      link: "/library"
    },
    {
      id: "settings",
      title: "Settings",
      icon: settings,
      link: "/settings"
    }
  ]

  return (
    <div 
      className="fixed left-0 top-0 h-full z-20"
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <Sidebar
        collapsed={isCollapsed}
        backgroundColor="transparent"
        rootStyles={{
          backgroundColor: 'transparent',
          height: '100%',
          backdropFilter: 'blur(12px)',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease'
        }}
      >
        <Menu
          menuItemStyles={{
            button: ({ level, active, disabled }) => {
              if (level === 0) {
                return {
                  color: disabled ? '#f5d9ff' : '#ffffff',
                  backgroundColor: active ? '#eecef9' : 'transparent',
                  '&:hover': {
                    backgroundColor: '#5a7aa8'
                  }
                }
              }
            }
          }}
        >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #374151' }}>
                <a href="/" >
           <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
</a>
          </div>
          {sideBarList.map((item) => (
            <MenuItem
              key={item.id}
              icon={
                <img 
                  src={item.icon} 
                  alt={item.title} 
                  className="w-5 h-5 object-contain brightness-0 invert" 
                />
              }
              component="a"
              href={item.link}
            >
              {item.title}
            </MenuItem>
          ))}
        </Menu>
      </Sidebar>
    </div>
  )
}

export default Leftbar