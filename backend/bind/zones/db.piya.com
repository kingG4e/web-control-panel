$TTL 3600
$ORIGIN piya.com.
@   IN SOA ns1.piya.com. admin.piya.com. (
        2025092706
        3600
        1800
        1209600
        300 )

@       IN NS  ns1.piya.com.
ns1     IN A   127.0.0.1

@       IN A   127.0.0.1
www     IN CNAME piya.com.


