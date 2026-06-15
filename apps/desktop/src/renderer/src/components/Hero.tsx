import rec1 from "../assets/images/rec1.png"
import rec2 from "../assets/images/rec2.png"
import rec3 from "../assets/images/rec3.png"
import gsap from "gsap"

export function Hero() {
   gsap.to(".title", {
      duration: 2.5,
      scrambleText: {
        text: "smarter",
        chars: "***",
        revealDelay: 0.2,
        tweenLength: true,
        speed: 0.1,
        newClass: "text-gradient",
      },
      ease: "power2.inOut",
      overwrite: "auto",
      repeat: -1,
      repeatDelay: 3,
    });
  return (
    <section id="hero" className="relative z-10 min-h-screen w-full">
      {/* Centered container */}
      <div className="flex flex-col items-center justify-center min-h-dvh w-full px-5 sm:px-10">
        
        {/* Hero content - centered */}
        <div className="flex flex-col items-center justify-center text-center w-full max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-6 px-6 text-center select-none">
            <h1 className="text-8xl md:text-[6vw] leading-none text-center font-semibold tracking-tight">
              Your desk,
            </h1>
            <div className="flex flex-row items-center gap-4 mt-10">
              <img src={rec1} className='rec1' alt="rec1" />
              <img src={rec2} alt="rec2" />
              <img src={rec3} alt="rec3" />
            </div>
            <h1 className='title'>
              smarter.
            </h1>
          </div>
        </div>
      </div>
    </section>
  )
}