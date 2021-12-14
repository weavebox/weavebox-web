import { useEffect, useRef } from "react";

type PropsType = {
  visible: boolean;
  setVisible: (visibleState: boolean) => void;
  title?: string;
  children: JSX.Element;
};

function Popup(props: PropsType) {
  const selfRef = useRef<HTMLDivElement>(null);
  const { visible, setVisible } = props;

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  });

  const handleClickOutside = (evt: any) => {
    const self = selfRef.current;
    if (!self?.contains(evt.target)) {
      setVisible(false);
    }
  };

  if (!props.visible) return null;

  return (
    <>
      <div className="fixed z-20 w-screen h-screen bg-black opacity-25"></div>
      <div className="fixed z-20 w-screen h-screen flex flex-col items-center justify-start">
        <div className="h-1/4"></div>
        <div ref={selfRef}>{props.children}</div>
      </div>
    </>
  );
}

export default Popup;
