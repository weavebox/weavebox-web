import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import usePortal from "../hooks/usePortal";

type PropsType = {
  id: string;
  visible: boolean;
  isModal?: boolean;
  setVisible: (visibleState: boolean) => void;
  title?: string;
  children: JSX.Element;
};

function Popup(props: PropsType) {
  const target = usePortal(props.id);
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
    if (!self?.contains(evt.target) && !props.isModal) {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return createPortal(
    <>
      <div className="fixed z-20 w-screen h-screen bg-black opacity-25"></div>
      <div className="fixed z-20 w-screen h-screen flex flex-col items-center justify-start">
        <div className="h-1/4"></div>
        <div ref={selfRef}>{props.children}</div>
      </div>
    </>,
    target
  );
}

export default Popup;
