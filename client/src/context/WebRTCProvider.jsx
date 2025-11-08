import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "./SocketProvider";

const WebRTCContext = createContext(null);
export const useWebRTC = () => useContext(WebRTCContext);

// Use proper ICE servers (add TURN if needed)
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const WebRTCProvider = ({ children }) => {
  const { socket } = useSocket();

  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);
  // Initialize PeerConnection
  const peer = useMemo(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to server");
        socket.emit("ice-candidate", event.candidate);
      }
    };

    // Handle incoming data channel
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (e) => {
        console.log("Received message:", e.data);
      };
    };

    peerRef.current = pc;
    return pc;
  }, [socket]);

  // Create offer and set local description
  const createOffer = async () => {
    const localOffer = await peer.createOffer();
    await peer.setLocalDescription(localOffer);
    console.log("Local offer created and stored");
    return localOffer;
  };

  const createAnswer=async(offer)=>{
       await peer.setRemoteDescription(offer)
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return answer
  }

  // Create a data channel
  const createDataChannel = (label, onMessageCallback) => {
    const channel = peerRef.current.createDataChannel(label);
    channel.onmessage = (e) => onMessageCallback && onMessageCallback(e.data);
    dataChannelRef.current = channel;
    return channel;
  };

  // Send data over the data channel
  const sendData = (data) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(data);
    } else {
      console.warn("Data channel is not open");
    }
  };

  // Automatically create offer on mount

  return (
    <WebRTCContext.Provider
      value={{
        peer,
        createOffer,
        createAnswer,
        createDataChannel,
        sendData,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};
