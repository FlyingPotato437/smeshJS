import * as React from "react"
import { cn } from "../../../lib/utils"

const PopoverContext = React.createContext({})

function Popover({ children, ...props }) {
  const [open, setOpen] = React.useState(false)
  
  return (
    <PopoverContext.Provider value={{ open, setOpen, ...props }}>
      <div className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

function PopoverTrigger({ children, asChild = false, ...props }) {
  const { open, setOpen } = React.useContext(PopoverContext)
  
  const handleClick = (e) => {
    e.preventDefault()
    setOpen(!open)
    if (props.onClick) props.onClick(e)
  }
  
  const Trigger = asChild ? React.Children.only(children) : 'button'
  
  return React.isValidElement(Trigger) ? (
    React.cloneElement(Trigger, {
      ...props,
      onClick: handleClick,
    })
  ) : (
    <Trigger
      {...props}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
        props.className
      )}
    >
      {children}
    </Trigger>
  )
}

function PopoverContent({ children, className, align = "center", ...props }) {
  const { open } = React.useContext(PopoverContext)
  
  if (!open) return null
  
  const alignClasses = {
    center: "left-1/2 -translate-x-1/2",
    start: "left-0",
    end: "right-0"
  }
  
  return (
    <div
      className={cn(
        "absolute z-50 mt-2 w-72 rounded-md border border-gray-200 bg-white p-4 shadow-md outline-none animate-in fade-in",
        "dark:border-gray-800 dark:bg-gray-900",
        alignClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Popover, PopoverTrigger, PopoverContent }