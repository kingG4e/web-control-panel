$TTL 3600
$ORIGIN phu.com.
@   IN SOA ns1.phu.com. admin.phu.com. (
        2025092611
        3600
        1800
        1209600
        300 )

@       IN NS  ns1.phu.com.
ns1     IN A   127.0.0.1

@       IN A   127.0.0.1
www     IN CNAME phu.com.


