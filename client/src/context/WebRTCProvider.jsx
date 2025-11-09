import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSocket } from "./SocketProvider";

const WebRTCContext = createContext(null);
export const useWebRTC = () => useContext(WebRTCContext);

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const WebRTCProvider = ({ children }) => {
  const { socket,roomId } = useSocket();
  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Create RTCPeerConnection
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;

    peer.onicecandidate = (e) => {
      console.log("iceCandidate:",e.candidate)
      if (e.candidate) {
        socket.emit("ice-candidate", { roomId, candidate: e.candidate });
      }
    };

  

    // peer.onconnectionstatechange = () => {
    //   const state = peer.connectionState;
    //   console.log("📡 WebRTC state:", state);
    //   setIsConnected(state === "connected");
    // };

    peer.ondatachannel = (e) => {
      console.log("📥 Receiver: Data channel opened");
      dataChannelRef.current = e.channel;
      dataChannelRef.current.onmessage = (e) => handleIncomingMessage(e.data);
    };

    // Cleanup
    return () => {
      peer.close();
      dataChannelRef.current?.close();
    };
  }, [socket]);

  // Handle incoming ICE candidates
  useEffect(() => {
    if (!socket) return;

    const handleIce = (candidate) => {
      peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    };
    socket.on("ice-candidate", handleIce);

    return () => socket.off("ice-candidate", handleIce);
  }, [socket]);

 

  const createDataChannel = (onMessage) => {
    const channel = peerRef.current.createDataChannel("file-transfer");
    dataChannelRef.current = channel;

    channel.onopen = () => {
      console.log("🚀 DataChannel open (sender)");
      setRemoteReady(true);
    };

    channel.onclose = () => console.log("❌ DataChannel closed");
    channel.onerror = (err) => console.error("⚠️ DataChannel error:", err);
    channel.onmessage = (e) => onMessage && onMessage(e.data);

    return channel;
  };

  const createOffer = async () => {
    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);
    return offer;
  };

  const createAnswer = async (offer) => {
    await peerRef.current.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);
    return answer;
  };

  const setRemoteDescription = async (desc) => {
  const peer = peerRef.current;
  try {
    await peer.setRemoteDescription(new RTCSessionDescription(desc));
    console.log("✅ Remote description set");
  } catch (err) {
    console.warn("⚠️ Failed to set remote description:", err.message);
  }
};


  const sendData = (data) => {
    const dc = dataChannelRef.current;
    if (dc?.readyState === "open") {
      dc.send(data);
    } else {
      console.warn("⚠️ DataChannel not ready to send data");
    }
  };

  const handleIncomingMessage = (data) => {
    // optional: can be replaced dynamically by user
    console.log("📦 Received data:", data);
  };

  return (
    <WebRTCContext.Provider
      value={{
        createOffer,
        createAnswer,
        setRemoteDescription,
        createDataChannel,
        sendData,
        isConnected,
        remoteReady,
        peerRef,
        dataChannelRef,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};
