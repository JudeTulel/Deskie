
import { ChatComponent } from './components/ChatComponent'
import { ScrollTrigger } from 'gsap/all'
import { Hero } from './components/Hero'
import  gsap  from 'gsap'
import '../src/assets/main.css'
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar'
import Leftbar from './components/Leftbar'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Desk from './components/Desk'
import Library from './components/Library'
import Settings from './components/Settings'




gsap.registerPlugin(ScrollTrigger)
function App(): React.JSX.Element {




  return (
    <Router>
      <Leftbar />
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/library" element={<Library />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/desk" element={<Desk />} />
      </Routes>
    </Router>
  )
}

export default App
