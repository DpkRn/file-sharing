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


      create binary data of giveb mb:
      command: dd if=/dev/urandom of=my_binary_file.bin bs=1M count=20


      check turn server
      turnutils_uclient -u test -w test123 -p 3478 203.0.113.5

