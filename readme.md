createPeerConnection
 └── createDataChannel
      └── onnegotiationneeded
           └── createOffer
                └── setLocalDescription
                     └── onicecandidate (multiple)
send offer → receiver
receiver:
 └── setRemoteDescription
      └── ondatachannel
           └── createAnswer
                └── setLocalDescription
                     └── onicecandidate (multiple)
send answer → sender
sender:
 └── setRemoteDescription
both:
 └── dataChannel.onopen
      └── send/receive data
