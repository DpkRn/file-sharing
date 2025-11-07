import React, { createContext, useContext, useRef } from "react";
import { useSocket } from "./SocketProvider";

const WebRTCContext = createContext(null);
export const useWebRTC = () => useContext(WebRTCContext);

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const WebRTCProvider = ({ children }) => {
  const { socket } = useSocket();
  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);

  const createPeerConnection = (onMessageCallback) => {
    peerRef.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("exchanging offer")
        socket.emit("ice-candidate", event.candidate);
      }
    };

    peerRef.current.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (e) => onMessageCallback && onMessageCallback(e.data);
    };

    return peerRef.current;
  };

  const createDataChannel = (label, onMessageCallback) => {
    dataChannelRef.current = peerRef.current.createDataChannel(label);
    dataChannelRef.current.onmessage = (e) =>
      onMessageCallback && onMessageCallback(e.data);
  };

  const sendData = (data) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(data);
    }
  };

  return (
    <WebRTCContext.Provider value={{ peerRef, createPeerConnection, createDataChannel, sendData }}>
      {children}
    </WebRTCContext.Provider>
  );
};
