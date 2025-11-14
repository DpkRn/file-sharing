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
  // TURN server (Expressturn)
  {
    urls: "turn:relay1.expressturn.com:3480?transport=udp",
    username: "000000002078142511",
    credential: "VZ805jWsN6nlnUxR4wA0r6Uv73Q="
  }
];

export const WebRTCProvider = ({ children }) => {
  const { socket, roomId, isSender } = useSocket();
  const [iceConnectionState, setIceConnectionState] = useState(null);
  const peerRef = useRef(null);
  const dataChannelRef = useRef(null);
  const [isIceConnected, setIsIceConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      console.log("socket is not there");
      return;
    }

    // Create RTCPeerConnection
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;

    peerRef.current.onicecandidate = (e) => {
      console.log("iceCandidate done:", e.candidate);
      if (e.candidate) {
        console.log(e.candidate);
        console.log("roomID:", roomId);
        socket.emit("ice-candidate", {
          roomId,
          candidate: e.candidate,
          isSender,
        });
      }
    };

    peer.oniceconnectionstatechange = () => {
      setIceConnectionState(peer.iceConnectionState);
      if (peer.iceConnectionState === "connected") {
        console.log("connected");
        setIsIceConnected(true);
      }
    };

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
  }, [socket, roomId]);

  // Handle incoming ICE candidates
  useEffect(() => {
    if (!socket) return;
    console.log("registered");
    const handleIce = ({ candidate }) => {
      console.log("its time to add candidate");
      peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      setIsIceConnected(true);
    };
    socket.on("ice-candidate", handleIce);
    return () => socket.off("ice-candidate", handleIce);
  }, [socket]);

  const createDataChannel = (onMessage) => {
    const channel = peerRef.current.createDataChannel("file-transfer");
    dataChannelRef.current = channel;

    channel.onclose = () => console.log("❌ DataChannel closed");
    channel.onerror = (err) => console.error("⚠️ DataChannel error:", err);
    channel.onmessage = (e) => onMessage && onMessage(e.data);
    channel.onbufferedamountlow = () => console.log("🟢 Buffered amount low — resuming sending");

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
    try {
      dc.send(data);
    } catch (err) {
      console.error("❌ Error sending data:", err);
    }
  } else {
    console.warn("⚠️ DataChannel not open, skipping chunk");
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
        isIceConnected,
        peerRef,
        dataChannelRef,
        iceConnectionState,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};
