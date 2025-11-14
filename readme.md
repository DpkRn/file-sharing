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


     check turn server: turnutils_uclient -u 000000002078142511 -w "VZ805jWsN6nlnUxR4wA0r6Uv73Q=" -t -y -p 3480 relay1.expressturn.com

     check stun server: stunclient stun.l.google.com 19302
