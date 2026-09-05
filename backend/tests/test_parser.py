import json
from app.scanner.parser import parse_airport_output, parse_system_profiler_output


def test_parse_airport_output():
    raw_airport = """                  SSID BSSID             RSSI CHANNEL HT CC SECURITY (auth/unicast/group)
          Home_Network 00:11:22:33:44:55 -45  36,80   Y  US WPA2(PSK/AES/AES)
         Neighbor_WiFi aa:bb:cc:dd:ee:ff -80  6       Y  US WPA3(PSK/AES/AES)
"""
    parsed = parse_airport_output(raw_airport)
    assert len(parsed) == 2
    assert parsed[0]["ssid"] == "Home_Network"
    assert parsed[0]["bssid"] == "00:11:22:33:44:55"
    assert parsed[0]["signal_dbm"] == -45
    assert parsed[0]["channel"] == 36
    assert parsed[0]["channel_width_mhz"] == 80
    assert parsed[0]["security"] == "WPA2"
    assert parsed[0]["wifi_standard"] == "802.11n"


def test_parse_system_profiler_output_interfaces():
    raw_sp_json = json.dumps({
        "SPAirPortDataType": [
            {
                "spairport_airport_interfaces": [
                    {
                        "_name": "en0",
                        "spairport_current_network_information": {
                            "_name": "MyWiFi",
                            "spairport_network_channel": "149 (5GHz, 80MHz)",
                            "spairport_network_phymode": "802.11ax",
                            "spairport_security_mode": "spairport_security_mode_wpa2_personal",
                            "spairport_signal_noise": "-44 dBm / -91 dBm"
                        },
                        "spairport_airport_other_local_wireless_networks": [
                            {
                                "_name": "<redacted>",
                                "spairport_network_channel": "6 (2GHz, 20MHz)",
                                "spairport_network_phymode": "802.11b/g/n",
                                "spairport_security_mode": "pairport_security_mode_wpa3_transition",
                                "spairport_signal_noise": "-75 dBm / -85 dBm"
                            }
                        ]
                    }
                ]
            }
        ]
    })

    parsed = parse_system_profiler_output(raw_sp_json)
    assert len(parsed) == 2

    # Current network
    assert parsed[0]["ssid"] == "MyWiFi"
    assert parsed[0]["channel"] == 149
    assert parsed[0]["channel_width_mhz"] == 80
    assert parsed[0]["signal_dbm"] == -44
    assert parsed[0]["security"] == "WPA2"
    assert parsed[0]["wifi_standard"] == "802.11ax"
    assert parsed[0]["band"] == "5 GHz"

    # Other network
    assert parsed[1]["ssid"] == "<Redacted by macOS>"
    assert parsed[1]["channel"] == 6
    assert parsed[1]["channel_width_mhz"] == 20
    assert parsed[1]["signal_dbm"] == -75
    assert parsed[1]["security"] == "WPA3/WPA2"
    assert parsed[1]["wifi_standard"] == "802.11n"
    assert parsed[1]["band"] == "2.4 GHz"
